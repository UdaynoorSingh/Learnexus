import os
import json
import re
import base64
import requests
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any
from dotenv import load_dotenv
import google.generativeai as genai
from openai import OpenAI

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel('gemini-2.5-flash')
vision_model = genai.GenerativeModel('gemini-2.5-flash')

try:
    groq_client = OpenAI(
        api_key=os.environ.get("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
    )
    openrouter_client = OpenAI(
        api_key=os.environ.get("OPEN_ROUTER_API_KEY"),
        base_url="https://openrouter.ai/api/v1",
    )
except Exception:
    pass

app = FastAPI(title="Learnexus AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OCRRequest(BaseModel):
    fileUrl: str
    mimeType: str

class TextRequest(BaseModel):
    text: str

class EmbedRequest(BaseModel):
    text: str
    topicId: Any

class TeachRequest(BaseModel):
    topicName: str
    topicId: Any
    contextMode: str = "both"
    context: Optional[str] = None

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    topicId: Any
    contextMode: str = "both"
    history: List[ChatMessage]
    message: str
    lectureContext: str

class TopicRequest(BaseModel):
    topicId: Any

class YouTubeRequest(BaseModel):
    url: str
    topicId: Any


class CommunityAutoAnswerRequest(BaseModel):
    title: str
    content: str
    topicId: Optional[Any] = None
    imageUrl: Optional[str] = None
    mimeType: Optional[str] = None


class CommunityAssignTagRequest(BaseModel):
    content: str
    existingTags: List[str]


class CommunityIngestSolutionRequest(BaseModel):
    tag: str
    question: str
    answer: str


class CommunityMascotChatRequest(BaseModel):
    tag: str
    query: str


def call_groq(prompt: str, fallback: bool = True) -> str:
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content
    except Exception as e:
        if fallback:
            print(f"Groq API failed ({e}). Falling back to OpenRouter...")
            return call_openrouter(prompt, fallback=False)
        raise

def call_openrouter(prompt: str, fallback: bool = True) -> str:
    try:
        response = openrouter_client.chat.completions.create(
            model="meta-llama/llama-3.3-70b-instruct:free",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content
    except Exception as e:
        if fallback:
            print(f"OpenRouter API failed ({e}). Falling back to Groq...")
            return call_groq(prompt, fallback=False)
        raise


def community_room_index_dir(tag: str) -> str:
    raw = (tag or "").strip()
    if not raw:
        raw = "room"
    safe = re.sub(r"[^\w\-.]", "_", raw)
    safe = re.sub(r"_+", "_", safe).strip("._-")[:100] or "room"
    return os.path.join("vector_stores", "community", f"{safe}_index")


def retrieve_context(topic_id: Any, query: str, k: int = 15, context_mode: str = "both") -> str:
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=os.getenv("GEMINI_API_KEY"))
    
    docs = []
    base_path = f"vector_stores/{topic_id}"
    old_index_path = os.path.join(base_path, "index.faiss")
    notes_path = os.path.join(base_path, "notes_index")
    youtube_path = os.path.join(base_path, "youtube_index")

    if os.path.exists(old_index_path):
        import shutil
        os.makedirs(notes_path, exist_ok=True)
        shutil.move(old_index_path, os.path.join(notes_path, "index.faiss"))
        if os.path.exists(os.path.join(base_path, "index.pkl")):
            shutil.move(os.path.join(base_path, "index.pkl"), os.path.join(notes_path, "index.pkl"))
    
    paths_to_check = []
    if context_mode in ["notes", "both"] and os.path.exists(os.path.join(notes_path, "index.faiss")):
        paths_to_check.append(("Notes snippet", notes_path))
    if context_mode in ["youtube", "both"] and os.path.exists(os.path.join(youtube_path, "index.faiss")):
        paths_to_check.append(("YouTube snippet", youtube_path))
        
    for source_label, path in paths_to_check:
        try:
            vectorstore = FAISS.load_local(path, embeddings, allow_dangerous_deserialization=True)
            k_per_store = k if len(paths_to_check) == 1 else max(1, k // 2)
            store_docs = vectorstore.similarity_search(query, k=k_per_store)
            docs.extend([f"[{source_label}]: {d.page_content}" for d in store_docs])
        except Exception:
            pass
            
    return "\n\n".join(docs)

@app.post("/api/ai/ocr")
async def extract_text(req: OCRRequest):
    try:
        resp = requests.get(req.fileUrl, timeout=30)
        resp.raise_for_status()

        image_parts = [
            {
                "mime_type": req.mimeType,
                "data": resp.content
            }
        ]
        prompt = "Extract all the text from this image or document. If it contains messy handwritten notes, read and transcribe them accurately. Return ONLY the extracted text, no extra conversational words."
        
        response = vision_model.generate_content([prompt, image_parts[0]])
        return {"text": response.text.strip()}
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/embed")
async def embed_text(req: EmbedRequest):
    try:
        if not req.text.strip():
            return {"status": "ignored"}
            
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_text(req.text)
        
        embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=os.getenv("GEMINI_API_KEY"))
        vectorstore = FAISS.from_texts(chunks, embeddings)
        
        save_path = f"vector_stores/{req.topicId}/notes_index"
        os.makedirs(save_path, exist_ok=True)
        
        if os.path.exists(os.path.join(save_path, "index.faiss")):
            existing_db = FAISS.load_local(save_path, embeddings, allow_dangerous_deserialization=True)
            existing_db.merge_from(vectorstore)
            existing_db.save_local(save_path)
        else:
            vectorstore.save_local(save_path)
            
        return {"status": "success"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/moderate")
async def moderate_text(req: TextRequest):
    try:
        text = (req.text or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="text is required")

        prompt = """You are a community moderator for an academic student forum.
Analyze the user's message for:
- vulgarity, slurs, or sexually explicit content
- spam (repeated characters, irrelevant ads, scam patterns, excessive links)

You MUST respond with ONLY a valid JSON object (no markdown, no code fences, no extra text) in exactly this shape:
{"isToxic": true or false, "reason": "brief reason in under 120 characters"}

Use isToxic: true only for clear violations; err on the side of false for normal academic frustration or strong opinions without slurs.

User message to analyze:
"""
        text_resp = call_groq(prompt + text).strip()

        if text_resp.startswith("```json"):
            text_resp = text_resp.replace("```json", "").replace("```", "").strip()
        elif text_resp.startswith("```"):
            text_resp = text_resp.replace("```", "").strip()

        data = json.loads(text_resp)
        is_toxic = bool(data.get("isToxic"))
        reason = str(data.get("reason") or ("Flagged by moderator" if is_toxic else "OK")).strip()[:500]
        return {"isToxic": is_toxic, "reason": reason}
    except HTTPException:
        raise
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON for moderation.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/community/assign-tag")
async def community_assign_tag(req: CommunityAssignTagRequest):
    try:
        content = (req.content or "").strip()
        if not content:
            raise HTTPException(status_code=400, detail="content is required")
        existing = req.existingTags if isinstance(req.existingTags, list) else []
        existing_json = json.dumps(existing[:800])

        prompt = f"""You assign exactly ONE Nexus Board "room" tag for a student forum post.

existingTags (exact strings already in use — reuse one when the post clearly fits that topic):
{existing_json}

Instructions:
1. Read the post content at the end.
2. Compare it to existingTags. If it matches an existing concept well, return that EXACT string from the array (character-for-character, including the leading # if present).
3. ONLY if the post is a completely new academic topic that does not fit any existing tag, invent ONE new tag: must start with #, use only letters, digits, and underscores, concise (e.g. #Compiler_Optimization).

You MUST respond with ONLY valid JSON (no markdown code fences, no extra text) in exactly this shape:
{{"tag": "your_chosen_tag_string"}}

Post content:
{content}
"""
        text_resp = call_groq(prompt).strip()

        if text_resp.startswith("```json"):
            text_resp = text_resp.replace("```json", "").replace("```", "").strip()
        elif text_resp.startswith("```"):
            text_resp = text_resp.replace("```", "").strip()

        data = json.loads(text_resp)
        tag = str(data.get("tag", "")).strip()
        if not tag:
            raise HTTPException(status_code=500, detail="Model returned an empty tag.")
        return {"tag": tag}
    except HTTPException:
        raise
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON for tag assignment.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/summarize")
async def summarize_text(req: TextRequest):
    try:
        prompt = f"""
        Summarize the following academic text in a clear, concise manner.
        Keep the summary informative and well-structured. Maximum 200 words.
        
        Text: {req.text}
        """
        text_resp = call_groq(prompt)
        return {"summary": text_resp.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/keypoints")
async def extract_keypoints(req: TextRequest):
    try:
        prompt = f"""
        Extract the key points from the following academic text.
        You MUST return ONLY a valid JSON array of strings. Do not include markdown blocks like ```json.
        Example format: ["Point 1", "Point 2", "Point 3"]
        
        Text: {req.text}
        """
        text_resp = call_groq(prompt).strip()
        
        if text_resp.startswith("```json"):
            text_resp = text_resp.replace("```json", "").replace("```", "").strip()
            
        try:
            keypoints_list = json.loads(text_resp)
        except json.JSONDecodeError:
            keypoints_list = [line.strip("- *") for line in text_resp.split("\n") if line.strip()]

        return {"keyPoints": keypoints_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/teach")
async def generate_lecture(req: TeachRequest):
    try:
        retrieved_context = retrieve_context(req.topicId, "core concepts, main ideas, detailed explanations, architecture, relationships, and key takeaways", k=20, context_mode=req.contextMode)
        context_str = f"Extracted Source Notes/Video Snippets:\n{retrieved_context}\n\nAdditional context (Title/Subject): {req.context}"
        prompt = f"""
        Generate a comprehensive, well-structured lecture on "{req.topicName}" for a university-level student.
        {context_str}
        
        Structure the lecture exactly with these markdown sections:
        ## Introduction
        ## Core Concepts
        ## Detailed Explanation
        ## Examples
        ## Key Takeaways
        ## Practice Questions
        """
        text_resp = call_openrouter(prompt)
        return {"lecture": text_resp.strip()}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/chat")
async def chat_interaction(req: ChatRequest):
    try:
        retrieved_context = retrieve_context(req.topicId, req.message, k=4, context_mode=req.contextMode)

        formatted_history = []
        
        system_instruction = f"You are an expert academic tutor. Base Context: {req.lectureContext}."
        if retrieved_context:
            system_instruction += f"\n\nStudent's Extracted Notes (Use this to answer their questions accurately):\n{retrieved_context}"
        
        formatted_history.append({"role": "system", "content": system_instruction})
        
        for msg in req.history:
            role = "assistant" if msg.role == "model" or msg.role == "assistant" else "user"
            formatted_history.append({"role": role, "content": msg.text})
            
        formatted_history.append({"role": "user", "content": req.message})
        
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=formatted_history
        )
        return {"reply": response.choices[0].message.content.strip()}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/flashcards")
async def generate_flashcards(req: TopicRequest):
    try:
        context = retrieve_context(req.topicId, "core concepts, main ideas, definitions, and formulas", k=15)
        if not context.strip():
            raise HTTPException(status_code=404, detail="No notes or video transcripts found for this topic. Upload content first to generate flashcards.")

        prompt = f"""Based STRICTLY on the following academic notes, generate exactly 10 flashcards for a student to study.
Each flashcard must have a clear, specific question and a concise, accurate answer.
You MUST return ONLY a valid JSON array. Do not include markdown code blocks like ```json.
Format: [{{"q": "What is...?", "a": "It is..."}}]

Academic Notes:
{context}"""

        text_resp = call_groq(prompt).strip()

        if text_resp.startswith("```json"):
            text_resp = text_resp.replace("```json", "").replace("```", "").strip()
        elif text_resp.startswith("```"):
            text_resp = text_resp.replace("```", "").strip()

        flashcards = json.loads(text_resp)
        return {"flashcards": flashcards}
    except HTTPException:
        raise
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON. Please try again.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/exam/generate")
async def generate_exam(req: TopicRequest):
    try:
        context = retrieve_context(req.topicId, "core concepts, main ideas, definitions, and formulas", k=20)
        if not context.strip():
            raise HTTPException(status_code=404, detail="No notes or video transcripts found for this topic. Upload content first to take an exam.")

        prompt = f"""Based STRICTLY on the following academic notes, generate exactly 5 multiple-choice questions to test a student's understanding.
Each question must have exactly 4 options (A, B, C, D), one correct answer, and a brief explanation of why the correct answer is right.
You MUST return ONLY a valid JSON array. Do not include markdown code blocks like ```json.
Format: [{{"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctAnswer": "A. ...", "explanation": "..."}}]

Academic Notes:
{context}"""

        text_resp = call_groq(prompt).strip()

        if text_resp.startswith("```json"):
            text_resp = text_resp.replace("```json", "").replace("```", "").strip()
        elif text_resp.startswith("```"):
            text_resp = text_resp.replace("```", "").strip()

        exam = json.loads(text_resp)
        return {"exam": exam}
    except HTTPException:
        raise
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON. Please try again.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/youtube/embed")
async def youtube_embed(req: YouTubeRequest):
    try:
        url = req.url.strip()
        video_id = None
        patterns = [
            r'(?:v=|/v/|youtu\.be/)([a-zA-Z0-9_-]{11})',
            r'(?:embed/)([a-zA-Z0-9_-]{11})',
            r'^([a-zA-Z0-9_-]{11})$'
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                video_id = match.group(1)
                break

        if not video_id:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL. Please provide a valid YouTube video link.")

        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            ytt_api = YouTubeTranscriptApi()
            transcript_list = ytt_api.fetch(video_id)
            full_text = " ".join([entry.text for entry in transcript_list])
        except Exception as transcript_err:
            raise HTTPException(
                status_code=400,
                detail=f"Could not fetch transcript for this video. The video may not have captions enabled. Error: {str(transcript_err)}"
            )

        if not full_text.strip():
            raise HTTPException(status_code=400, detail="The video transcript is empty. No content to embed.")

        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_text(full_text)

        chunks = splitter.split_text(full_text)

        embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=os.getenv("GEMINI_API_KEY"))
        vectorstore = FAISS.from_texts(chunks, embeddings)

        save_path = f"vector_stores/{req.topicId}/youtube_index"
        os.makedirs(save_path, exist_ok=True)

        if os.path.exists(os.path.join(save_path, "index.faiss")):
            existing_db = FAISS.load_local(save_path, embeddings, allow_dangerous_deserialization=True)
            existing_db.merge_from(vectorstore)
            existing_db.save_local(save_path)
        else:
            vectorstore.save_local(save_path)

        summary_text = full_text[:3000]
        summary_prompt = f"""Summarize the following YouTube video transcript in 2-3 sentences.
Focus on the main topics covered.

Transcript excerpt:
{summary_text}"""
        summary = call_groq(summary_prompt).strip()

        return {
            "status": "success",
            "chunks": len(chunks),
            "summary": summary,
            "message": f"Successfully embedded {len(chunks)} chunks from the YouTube video into your knowledge base."
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/mindmap")
async def generate_mindmap(req: TopicRequest):
    try:
        context = retrieve_context(req.topicId, "core concepts, architecture, relationships, definitions, and key ideas", k=20)
        if not context.strip():
            raise HTTPException(status_code=404, detail="No notes or videos found for this topic. Upload content first to generate a mind map.")

        prompt = f"""You are a data structurer. Analyze the following academic notes and extract a logical, hierarchical mind map of the key concepts and their relationships.

You MUST return ONLY a valid JSON object (no markdown, no code blocks, no extra text) with this EXACT structure:
{{
  "nodes": [
    {{ "id": "1", "position": {{ "x": 400, "y": 0 }}, "data": {{ "label": "Main Topic" }} }}
  ],
  "edges": [
    {{ "id": "e1-2", "source": "1", "target": "2" }}
  ]
}}

STRICT RULES:
1. The first node (id "1") is the central/main topic. Place it at the top center (x=400, y=0).
2. Create 6-12 nodes total representing the most important concepts, sub-concepts, and relationships.
3. Calculate x and y positions so nodes form a clean top-down tree layout:
   - Level 0 (root): y=0, centered at x=400
   - Level 1 (main branches): y=150, spread horizontally with at least 220px between nodes
   - Level 2 (sub-branches): y=300, spread horizontally with at least 200px between nodes
   - Level 3 (details): y=450, spread horizontally with at least 180px between nodes
4. Node labels should be concise (2-6 words maximum).
5. Every edge id must follow the pattern "e{{source}}-{{target}}".
6. Every node except the root must have exactly one incoming edge.
7. Return RAW JSON only. No markdown formatting, no ```json blocks.

Academic Notes:
{context}"""

        text_resp = call_openrouter(prompt).strip()

        if text_resp.startswith("```json"):
            text_resp = text_resp.replace("```json", "").replace("```", "").strip()
        elif text_resp.startswith("```"):
            text_resp = text_resp.replace("```", "").strip()

        mindmap_data = json.loads(text_resp)

        if "nodes" not in mindmap_data or "edges" not in mindmap_data:
            raise ValueError("AI response missing required 'nodes' or 'edges' keys.")

        return mindmap_data
    except HTTPException:
        raise
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON for the mind map. Please try again.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/ai/podcast")
async def generate_podcast(req: TopicRequest):
    try:
        context = retrieve_context(req.topicId, "core concepts, key ideas, definitions, important details, examples, and relationships", k=25)
        if not context.strip():
            raise HTTPException(status_code=404, detail="No notes or videos found for this topic. Upload content first to generate an audio overview.")

        prompt = f"""You are an expert educational podcast producer. Read the following academic notes and write a conversational, engaging 2-3 minute podcast script between two hosts.

Host A ("Host A"): The curious, enthusiastic student who asks great questions, makes relatable analogies, and reacts with genuine excitement.
Host B ("Host B"): The knowledgeable, friendly professor who explains concepts clearly, gives examples, and builds on Host A's observations.

CONVERSATION RULES:
1. Start with a warm, natural greeting and topic introduction.
2. Cover ALL the major concepts from the notes in a logical flow.
3. Use conversational language — contractions, reactions like "Oh wow!", "Right, exactly!", "That's a great point!".
4. Host A should ask follow-up questions that a real student would ask.
5. Host B should give clear, concise answers with real-world analogies when possible.
6. End with a brief recap and an encouraging sign-off.
7. Each line of dialogue should be 1-3 sentences maximum. Keep it punchy and natural.
8. Generate 15-25 dialogue exchanges total for a 2-3 minute runtime.

You MUST return ONLY a valid JSON array (no markdown, no code blocks, no extra text).
Format:
[
  {{"speaker": "Host A", "text": "Welcome to today's deep dive! I'm really excited about this topic."}},
  {{"speaker": "Host B", "text": "Me too! Today we're exploring something really fundamental..."}}
]

STRICT: Return RAW JSON only. No ```json blocks. No markdown formatting.

Academic Notes:
{context}"""

        text_resp = call_openrouter(prompt).strip()

        if text_resp.startswith("```json"):
            text_resp = text_resp.replace("```json", "").replace("```", "").strip()
        elif text_resp.startswith("```"):
            text_resp = text_resp.replace("```", "").strip()

        podcast_script = json.loads(text_resp)

        if not isinstance(podcast_script, list) or len(podcast_script) == 0:
            raise ValueError("AI returned an empty or invalid podcast script.")
        for line in podcast_script:
            if "speaker" not in line or "text" not in line:
                raise ValueError("Each podcast line must have 'speaker' and 'text' keys.")

        return {"script": podcast_script}
    except HTTPException:
        raise
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON for the podcast script. Please try again.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/community/auto-answer")
async def community_auto_answer(req: CommunityAutoAnswerRequest):
    try:
        title = (req.title or "").strip()
        body = (req.content or "").strip()
        if not title and not body:
            raise HTTPException(status_code=400, detail="title or content is required")

        query_text = (title + "\n\n" + body).strip()
        context = ""
        if req.topicId is not None and str(req.topicId).strip() != "":
            context = retrieve_context(req.topicId, query_text, k=14, context_mode="both")

        ctx_block = context.strip() if context.strip() else "(No indexed course materials matched this topic — use solid general knowledge.)"

        prompt_intro = """You are a brilliant, approachable senior university student on an academic help forum.
Write a helpful reply to the post below. Be accurate, encouraging, and concise where possible.
Format your entire answer in **Markdown**: use **bold**, bullet lists when useful, and fenced code blocks with a language tag for any code (e.g. ```cpp).

If "Course materials" below contains relevant excerpts, ground your answer in them and paraphrase key ideas.
If the materials are empty or irrelevant, rely on general subject knowledge and say so briefly if needed.

### Course materials (retrieved notes / transcripts)
"""
        text_prompt = (
            prompt_intro
            + ctx_block
            + "\n\n### Forum post\n**Title:** "
            + title
            + "\n\n**Body:**\n"
            + body
        )

        if req.imageUrl and str(req.imageUrl).strip():
            try:
                img_resp = requests.get(str(req.imageUrl).strip(), timeout=30)
                img_resp.raise_for_status()
                mime = (req.mimeType or img_resp.headers.get("Content-Type") or "image/jpeg").split(";")[0].strip()
                if not mime.startswith("image/"):
                    mime = "image/jpeg"
                image_part = {"mime_type": mime, "data": img_resp.content}
                full_prompt = text_prompt + "\n\nThe author attached an image — use it together with the text when answering."
                response = vision_model.generate_content([full_prompt, image_part])
                answer = (response.text or "").strip()
            except Exception as img_err:
                import traceback
                traceback.print_exc()
                answer = call_openrouter(
                    text_prompt + "\n\n(Note: could not load attached image: " + str(img_err) + ")"
                ).strip()
        else:
            answer = call_openrouter(text_prompt).strip()

        if not answer:
            raise HTTPException(status_code=500, detail="Model returned an empty answer")

        return {"answer": answer}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/community/ingest-solution")
async def community_ingest_solution(req: CommunityIngestSolutionRequest):
    try:
        tag = (req.tag or "").strip()
        question = (req.question or "").strip()
        answer = (req.answer or "").strip()
        if not tag:
            raise HTTPException(status_code=400, detail="tag is required")
        if not question and not answer:
            raise HTTPException(status_code=400, detail="question and answer cannot both be empty")

        chunk = f"Question (solved post):\n{question}\n\nAccepted community solution:\n{answer}"
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001", google_api_key=os.getenv("GEMINI_API_KEY")
        )
        splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=150)
        chunks = splitter.split_text(chunk)
        if not chunks:
            chunks = [chunk[:50000]]

        vectorstore = FAISS.from_texts(chunks, embeddings)
        save_path = community_room_index_dir(tag)
        os.makedirs(save_path, exist_ok=True)

        if os.path.exists(os.path.join(save_path, "index.faiss")):
            existing_db = FAISS.load_local(save_path, embeddings, allow_dangerous_deserialization=True)
            existing_db.merge_from(vectorstore)
            existing_db.save_local(save_path)
        else:
            vectorstore.save_local(save_path)

        return {"status": "success", "indexPath": save_path}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/community/mascot-chat")
async def community_mascot_chat(req: CommunityMascotChatRequest):
    try:
        tag = (req.tag or "").strip()
        query = (req.query or "").strip()
        if not tag or tag == "#All":
            raise HTTPException(status_code=400, detail="A specific room tag is required (not #All).")
        if not query:
            raise HTTPException(status_code=400, detail="query is required")

        save_path = community_room_index_dir(tag)
        faiss_path = os.path.join(save_path, "index.faiss")
        if not os.path.exists(faiss_path):
            return {
                "reply": (
                    "This room does not have any indexed solved threads yet. "
                    "When someone marks a bounty post as solved, I learn from that Q&A — check back later, "
                    "or start a new discussion on the board."
                ),
                "indexed": False,
            }

        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001", google_api_key=os.getenv("GEMINI_API_KEY")
        )
        vectorstore = FAISS.load_local(save_path, embeddings, allow_dangerous_deserialization=True)
        docs = vectorstore.similarity_search(query, k=8)
        if not docs:
            return {
                "reply": (
                    "I could not match your question to anything in this room's solved library yet. "
                    "Try rephrasing, or open a new post for the community."
                ),
                "indexed": True,
            }

        context = "\n\n---\n\n".join(d.page_content for d in docs)
        prompt = f"""You are the "Room Mascot" for the academic forum room: {tag}.
Below are retrieved excerpts from previously SOLVED threads in this room only (question + accepted answer pairs).

STRICT RULES:
1. Base your answer ONLY on information supported by the excerpts. If they do not cover the student's question, say so clearly and suggest they post on the board or browse other threads — do NOT invent facts or use outside knowledge.
2. If excerpts partially help, answer the parts you can and note what is missing.
3. Use clear Markdown: **bold**, bullet lists, and fenced code blocks with a language tag when you include code.

### Retrieved solved-thread excerpts
{context}

### Student question
{query}
"""
        reply = call_groq(prompt).strip()
        if not reply:
            raise HTTPException(status_code=500, detail="Model returned an empty reply.")
        return {"reply": reply, "indexed": True}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    uvicorn.run(app, host="0.0.0.0", port=port)
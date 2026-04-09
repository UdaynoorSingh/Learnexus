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

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel('gemini-2.5-flash')
vision_model = genai.GenerativeModel('gemini-2.5-flash')

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


@app.post("/api/ai/summarize")
async def summarize_text(req: TextRequest):
    try:
        prompt = f"""
        Summarize the following academic text in a clear, concise manner.
        Keep the summary informative and well-structured. Maximum 200 words.
        
        Text: {req.text}
        """
        response = model.generate_content(prompt)
        return {"summary": response.text.strip()}
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
        response = model.generate_content(prompt)
        text_resp = response.text.strip()
        
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
        response = model.generate_content(prompt)
        return {"lecture": response.text.strip()}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/chat")
async def chat_interaction(req: ChatRequest):
    try:
        retrieved_context = retrieve_context(req.topicId, req.message, k=4, context_mode=req.contextMode)

        formatted_history = []
        for msg in req.history:
            role = "model" if msg.role == "assistant" else msg.role
            formatted_history.append({"role": role, "parts": [msg.text]})
        
        chat_session = model.start_chat(history=formatted_history)
        
        system_instruction = f"You are an expert academic tutor. Base Context: {req.lectureContext}."
        if retrieved_context:
            system_instruction += f"\n\nStudent's Extracted Notes (Use this to answer their questions accurately):\n{retrieved_context}"
            
        prompt = f"{system_instruction}\n\nStudent Question: {req.message}"
        
        response = chat_session.send_message(prompt)
        return {"reply": response.text.strip()}
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

        response = model.generate_content(prompt)
        text_resp = response.text.strip()

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

        response = model.generate_content(prompt)
        text_resp = response.text.strip()

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
        summary_response = model.generate_content(summary_prompt)
        summary = summary_response.text.strip()

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

        response = model.generate_content(prompt)
        text_resp = response.text.strip()

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

        response = model.generate_content(prompt)
        text_resp = response.text.strip()

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


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    uvicorn.run(app, host="0.0.0.0", port=port)
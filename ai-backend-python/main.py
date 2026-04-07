import os
import json
import base64
import requests
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any
from dotenv import load_dotenv
import google.generativeai as genai

# RAG specific imports
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Standard fast model for text
model = genai.GenerativeModel('gemini-2.5-flash')
# Vision model for handwriting OCR (using same flash model — it's multimodal)
vision_model = genai.GenerativeModel('gemini-2.5-flash')

app = FastAPI(title="Learnexus AI Backend")

# Allow Node.js backend to communicate with this Python server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- PYDANTIC MODELS (Strict Input Validation) ---
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
    context: Optional[str] = None

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    topicId: Any
    history: List[ChatMessage]
    message: str
    lectureContext: str

class TopicRequest(BaseModel):
    topicId: Any


# --- ENDPOINTS ---

@app.post("/api/ai/ocr")
async def extract_text(req: OCRRequest):
    """Agent Task 1: Act as the Eyes (Vision OCR) - Memory Optimized"""
    try:
        # Download the file directly in Python memory instead of proxying through Node.js
        resp = requests.get(req.fileUrl, timeout=30)
        resp.raise_for_status()

        # Prepare the image for Gemini Pro
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
    """FAISS Pipeline: Chunk and vectorize text by topicId"""
    try:
        if not req.text.strip():
            return {"status": "ignored"}
            
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_text(req.text)
        
        embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=os.getenv("GEMINI_API_KEY"))
        vectorstore = FAISS.from_texts(chunks, embeddings)
        
        save_path = f"vector_stores/{req.topicId}"
        os.makedirs(save_path, exist_ok=True)
        
        # Merge if existing, otherwise save new
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
    """Agent Task 2: Act as the Summarizer"""
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
    """Agent Task 3: Act as the Data Extractor (Forces JSON output)"""
    try:
        prompt = f"""
        Extract the key points from the following academic text.
        You MUST return ONLY a valid JSON array of strings. Do not include markdown blocks like ```json.
        Example format: ["Point 1", "Point 2", "Point 3"]
        
        Text: {req.text}
        """
        response = model.generate_content(prompt)
        text_resp = response.text.strip()
        
        # Clean up in case the LLM disobeys and adds markdown
        if text_resp.startswith("```json"):
            text_resp = text_resp.replace("```json", "").replace("```", "").strip()
            
        try:
            keypoints_list = json.loads(text_resp)
        except json.JSONDecodeError:
            # Fallback if LLM fails strict JSON
            keypoints_list = [line.strip("- *") for line in text_resp.split("\n") if line.strip()]

        return {"keyPoints": keypoints_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/teach")
async def generate_lecture(req: TeachRequest):
    """Agent Task 4: Act as the Professor"""
    try:
        context_str = f"Additional context: {req.context}" if req.context else ""
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
    """Phase 4: Tutor Interactive Chat with FAISS RAG injection"""
    try:
        # FAISS RAG Retrieval
        retrieved_context = ""
        save_path = f"vector_stores/{req.topicId}"
        if os.path.exists(save_path):
            embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=os.getenv("GEMINI_API_KEY"))
            vectorstore = FAISS.load_local(save_path, embeddings, allow_dangerous_deserialization=True)
            docs = vectorstore.similarity_search(req.message, k=3)
            retrieved_context = "\n".join([f"Note snippet: {d.page_content}" for d in docs])

        # Convert history format for Gemini & fix "assistant" crash bug
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
    """Active Recall: Generate 10 smart flashcards from FAISS knowledge base"""
    try:
        save_path = f"vector_stores/{req.topicId}"
        if not os.path.exists(os.path.join(save_path, "index.faiss")):
            raise HTTPException(status_code=404, detail="No notes found for this topic. Upload notes first to generate flashcards.")

        embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=os.getenv("GEMINI_API_KEY"))
        vectorstore = FAISS.load_local(save_path, embeddings, allow_dangerous_deserialization=True)
        docs = vectorstore.similarity_search("core concepts, main ideas, definitions, and formulas", k=10)
        context = "\n\n".join([d.page_content for d in docs])

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
    """Active Recall: Generate 5-question MCQ exam from FAISS knowledge base"""
    try:
        save_path = f"vector_stores/{req.topicId}"
        if not os.path.exists(os.path.join(save_path, "index.faiss")):
            raise HTTPException(status_code=404, detail="No notes found for this topic. Upload notes first to take an exam.")

        embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=os.getenv("GEMINI_API_KEY"))
        vectorstore = FAISS.load_local(save_path, embeddings, allow_dangerous_deserialization=True)
        docs = vectorstore.similarity_search("core concepts, main ideas, definitions, and formulas", k=15)
        context = "\n\n".join([d.page_content for d in docs])

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


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    uvicorn.run(app, host="0.0.0.0", port=port)
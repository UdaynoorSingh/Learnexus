import os
import json
import base64
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
# We use Gemini 1.5 Flash as it is fast and supports multimodality (vision)
model = genai.GenerativeModel('gemini-2.5-flash')

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
    image: str # Base64 string
    mimeType: str

class TextRequest(BaseModel):
    text: str

class ClassifyRequest(BaseModel):
    text: str
    availableTopics: List[str]

class TeachRequest(BaseModel):
    topicName: str
    context: Optional[str] = None

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    history: List[ChatMessage]
    message: str
    lectureContext: str


# --- ENDPOINTS ---

@app.post("/api/ai/ocr")
async def extract_text(req: OCRRequest):
    """Agent Task 1: Act as the Eyes (Vision OCR)"""
    try:
        # Prepare the image for Gemini
        image_parts = [
            {
                "mime_type": req.mimeType,
                "data": base64.b64decode(req.image)
            }
        ]
        prompt = "Extract all the text from this image or document. If it contains handwritten notes, read and transcribe them accurately. Return ONLY the extracted text, no extra conversational words."
        
        response = model.generate_content([prompt, image_parts[0]])
        return {"text": response.text.strip()}
    
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
    """Phase 4: Tutor Interactive Chat"""
    try:
        # Convert history format for Gemini
        formatted_history = []
        for msg in req.history:
            # Gemini roles are 'user' and 'model'
            formatted_history.append({"role": msg.role, "parts": [msg.text]})
        
        chat_session = model.start_chat(history=formatted_history)
        
        system_instruction = f"You are an expert academic tutor. Context: {req.lectureContext}. Answer the student's question concisely."
        prompt = f"{system_instruction}\nStudent Question: {req.message}"
        
        response = chat_session.send_message(prompt)
        return {"reply": response.text.strip()}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    uvicorn.run(app, host="0.0.0.0", port=port)
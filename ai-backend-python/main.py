import os
import json
import re
import base64
import hashlib
import time
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

_platform_port = os.environ.get("PORT")
load_dotenv()
if _platform_port is not None:
    os.environ["PORT"] = _platform_port

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


@app.get("/")
async def root():
    return {"service": "learnexus-ai-backend", "status": "ok"}


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "learnexus-ai-backend"}


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

class ConceptGraphRequest(BaseModel):
    topicId: Optional[Any] = None
    contextMode: str = "both"
    hint: Optional[str] = None


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


class TaskIdeasRequest(BaseModel):
    prompt: str


class NexGuideRequest(BaseModel):
    query: str
    currentPath: Optional[str] = None


def truncate_for_llm(text: str, max_chars: int = 6000) -> str:
    text = (text or "").strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n\n[Text truncated for AI processing.]"


def call_gemini(prompt: str) -> str:
    response = model.generate_content(prompt)
    return (response.text or "").strip()


def call_groq(prompt: str, fallback: bool = True, model_name: str = "llama-3.3-70b-versatile") -> str:
    try:
        response = groq_client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content
    except Exception as e:
        err = str(e)
        if "413" in err or "too large" in err.lower() or "tokens per minute" in err.lower():
            short_prompt = truncate_for_llm(prompt, 4000)
            if short_prompt != prompt:
                print("Groq TPM/context limit hit — retrying with truncated prompt.")
                return call_groq(short_prompt, fallback=False, model_name="llama-3.1-8b-instant")
        if fallback:
            print(f"Groq API failed ({e}). Falling back to Gemini...")
            return call_gemini(prompt)
        raise

def call_openrouter(prompt: str, fallback: bool = True) -> str:
    or_model = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct:free")
    try:
        response = openrouter_client.chat.completions.create(
            model=or_model,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content
    except Exception as e:
        if fallback:
            print(f"OpenRouter API failed ({e}). Falling back to Gemini...")
            return call_gemini(prompt)
        raise


def call_llm(prompt: str) -> str:
    try:
        return call_groq(prompt)
    except Exception:
        try:
            return call_gemini(prompt)
        except Exception:
            return call_openrouter(prompt, fallback=False)


def faiss_from_texts_rate_limited(texts: list, embeddings, batch_size: int = 8, pause_sec: float = 6.0):
    if not texts:
        raise ValueError("No text chunks to embed.")
    store = None
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        for attempt in range(5):
            try:
                batch_store = FAISS.from_texts(batch, embeddings)
                if store is None:
                    store = batch_store
                else:
                    store.merge_from(batch_store)
                break
            except Exception as e:
                err = str(e)
                if "429" in err or "RESOURCE_EXHAUSTED" in err or "quota" in err.lower():
                    wait = 12 * (attempt + 1)
                    print(f"Gemini embed rate limit — waiting {wait}s (batch {i // batch_size + 1})")
                    time.sleep(wait)
                else:
                    raise
        else:
            raise HTTPException(
                status_code=429,
                detail="Gemini embedding quota exceeded. Wait a minute and try uploading again."
            )
        if i + batch_size < len(texts):
            time.sleep(pause_sec)
    return store


PIPED_INSTANCES = [
    "https://pipedapi.kavin.rocks",
    "https://api.piped.yt",
    "https://pipedapi.leptons.xyz",
    "https://piped-api.codespace.cz",
    "https://api.piped.private.coffee",
    "https://pipedapi-libre.kavin.rocks",
    "https://pipedapi.minionflo.net",
    "https://pipedapi.ducks.party",
]

INVIDIOUS_INSTANCES = [
    "https://invidious.privacyredirect.com",
    "https://inv.nadeau.dev",
]

HTTP_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "application/json,text/plain,*/*",
}


def _http_get(url: str, proxies: Optional[dict] = None, timeout: int = 25) -> requests.Response:
    return requests.get(url, headers=HTTP_HEADERS, proxies=proxies, timeout=timeout)


def _http_post(url: str, payload: dict, proxies: Optional[dict] = None, timeout: int = 25) -> requests.Response:
    headers = {**HTTP_HEADERS, "Content-Type": "application/json"}
    return requests.post(url, json=payload, headers=headers, proxies=proxies, timeout=timeout)


def _parse_vtt_timestamp(ts: str) -> float:
    ts = ts.strip().split()[0].replace(",", ".")
    parts = ts.split(":")
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
    if len(parts) == 2:
        return int(parts[0]) * 60 + float(parts[1])
    return float(parts[0]) if parts else 0.0


def _parse_webvtt(content: str) -> list:
    segments = []
    lines = content.replace("\r\n", "\n").split("\n")
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if "-->" in line:
            start_s, end_s = [p.strip() for p in line.split("-->", 1)]
            start = _parse_vtt_timestamp(start_s)
            end = _parse_vtt_timestamp(end_s)
            i += 1
            text_lines = []
            while i < len(lines) and lines[i].strip() and "-->" not in lines[i]:
                text_lines.append(re.sub(r"<[^>]+>", "", lines[i].strip()))
                i += 1
            text = " ".join(text_lines).strip()
            if text:
                segments.append({"start": start, "duration": max(0.0, end - start), "text": text})
        else:
            i += 1
    return segments


def _parse_json3(content: str) -> list:
    data = json.loads(content)
    segments = []
    for ev in data.get("events", []):
        start = float(ev.get("tStartMs", 0)) / 1000.0
        dur = float(ev.get("dDurationMs", 0)) / 1000.0
        text = "".join(str(p.get("utf8", "")) for p in (ev.get("segs") or [])).strip().replace("\n", " ")
        if text:
            segments.append({"start": start, "duration": dur, "text": text})
    return segments


def _parse_subtitle_payload(content: str, mime_type: str = "") -> list:
    mime = (mime_type or "").lower()
    stripped = (content or "").strip()
    if not stripped:
        return []
    if "json" in mime or stripped.startswith("{"):
        try:
            return _parse_json3(stripped)
        except json.JSONDecodeError:
            pass
    return _parse_webvtt(stripped)


def _pick_english_track(tracks: list) -> Optional[dict]:
    if not tracks:
        return None
    for t in tracks:
        code = str(t.get("code") or t.get("language_code") or t.get("languageCode") or "").lower()
        label = str(t.get("name") or t.get("label") or "").lower()
        if code.startswith("en") or "english" in label:
            return t
    return tracks[0]


def _fetch_transcript_via_innertube(video_id: str, proxies: Optional[dict] = None) -> list:
    player_url = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false"
    payload = {
        "context": {
            "client": {
                "clientName": "ANDROID",
                "clientVersion": "19.09.37",
                "androidSdkVersion": 30,
                "hl": "en",
                "gl": "US",
            }
        },
        "videoId": video_id,
    }
    r = _http_post(player_url, payload, proxies=proxies)
    r.raise_for_status()
    data = r.json()
    tracks = (
        data.get("captions", {})
        .get("playerCaptionsTracklistRenderer", {})
        .get("captionTracks", [])
    )
    if not tracks:
        raise ValueError("No captions on this video")

    track = _pick_english_track(tracks)
    base_url = track.get("baseUrl")
    if not base_url:
        raise ValueError("No caption URL in player response")

    for fmt in ("json3", "vtt", "srv3"):
        sep = "&" if "?" in base_url else "?"
        cap = _http_get(f"{base_url}{sep}fmt={fmt}", proxies=proxies)
        if cap.status_code != 200 or not (cap.text or "").strip():
            continue
        mime = "json3" if fmt == "json3" else "text/vtt"
        segments = _parse_subtitle_payload(cap.text, mime)
        if segments:
            print(f"YouTube transcript via innertube ({fmt})")
            return segments
    raise ValueError("Could not parse innertube caption payload")


def _fetch_transcript_via_piped(video_id: str, proxies: Optional[dict] = None) -> list:
    for base in PIPED_INSTANCES:
        base = base.rstrip("/")
        try:
            r = _http_get(f"{base}/streams/{video_id}", proxies=proxies)
            if r.status_code != 200:
                continue
            try:
                data = r.json()
            except json.JSONDecodeError:
                continue
            subs = data.get("subtitles") or []
            track = _pick_english_track(subs)
            if not track or not track.get("url"):
                continue
            sub_url = str(track["url"]).strip()
            if sub_url.startswith("/"):
                sub_url = f"{base}{sub_url}"
            elif not sub_url.startswith("http"):
                sub_url = f"{base}/{sub_url.lstrip('/')}"
            tr = _http_get(sub_url, proxies=proxies)
            tr.raise_for_status()
            segments = _parse_subtitle_payload(tr.text, track.get("mimeType", ""))
            if segments:
                print(f"YouTube transcript via Piped ({base})")
                return segments
        except Exception as e:
            print(f"Piped {base} failed: {e}")
    raise ValueError("Piped transcript fetch failed")


def _fetch_transcript_via_invidious(video_id: str, proxies: Optional[dict] = None) -> list:
    for base in INVIDIOUS_INSTANCES:
        base = base.rstrip("/")
        try:
            r = _http_get(f"{base}/api/v1/captions/{video_id}", proxies=proxies)
            if r.status_code != 200:
                continue
            tracks = r.json()
            if not isinstance(tracks, list) or not tracks:
                continue
            track = _pick_english_track(tracks)
            caption_url = track.get("url")
            if caption_url:
                if str(caption_url).startswith("/"):
                    caption_url = f"{base}{caption_url}"
                tr = _http_get(caption_url, proxies=proxies)
            else:
                label = track.get("label") or track.get("name") or "English"
                tr = _http_get(f"{base}/api/v1/captions/{video_id}?label={label}", proxies=proxies)
            tr.raise_for_status()
            segments = _parse_subtitle_payload(tr.text)
            if segments:
                print(f"YouTube transcript via Invidious ({base})")
                return segments
        except Exception as e:
            print(f"Invidious {base} failed: {e}")
    raise ValueError("Invidious transcript fetch failed")


def _fetch_transcript_via_supadata(video_id: str) -> list:
    api_key = (os.getenv("SUPADATA_API_KEY") or "").strip()
    if not api_key:
        raise ValueError("SUPADATA_API_KEY not set")
    r = requests.get(
        "https://api.supadata.ai/v1/youtube/transcript",
        params={"videoId": video_id, "lang": "en"},
        headers={"x-api-key": api_key, **HTTP_HEADERS},
        timeout=30,
    )
    if r.status_code != 200:
        raise ValueError(f"Supadata HTTP {r.status_code}: {r.text[:200]}")
    data = r.json()
    content = data.get("content") or data.get("transcript") or data.get("text")
    if isinstance(content, list):
        segments = []
        for item in content:
            if isinstance(item, dict):
                segments.append({
                    "start": float(item.get("start", item.get("offset", 0))),
                    "duration": float(item.get("duration", item.get("dur", 0))),
                    "text": str(item.get("text", item.get("content", ""))).strip(),
                })
            elif isinstance(item, str) and item.strip():
                segments.append({"start": 0.0, "duration": 0.0, "text": item.strip()})
        if segments:
            print("YouTube transcript via Supadata")
            return segments
    if isinstance(content, str) and content.strip():
        print("YouTube transcript via Supadata (plain text)")
        return [{"start": 0.0, "duration": 0.0, "text": content.strip()}]
    raise ValueError("Supadata returned empty transcript")


def _proxy_dict_from_env() -> Optional[dict]:
    p = (os.getenv("YOUTUBE_TRANSCRIPT_PROXY") or "").strip()
    https_p = (os.getenv("HTTPS_PROXY") or "").strip()
    http_p = (os.getenv("HTTP_PROXY") or "").strip()
    if p:
        return {"http": p, "https": p}
    if https_p or http_p:
        d = {}
        if http_p:
            d["http"] = http_p
        if https_p:
            d["https"] = https_p
        return d or None
    return None


def _fetch_transcript_youtube_api(video_id: str, proxies: Optional[dict]) -> list:
    from youtube_transcript_api import YouTubeTranscriptApi

    if hasattr(YouTubeTranscriptApi, "get_transcript"):
        transcript_entries = YouTubeTranscriptApi.get_transcript(video_id, proxies=proxies)
        print("YouTube transcript via youtube-transcript-api")
        return [
            {
                "start": float(e.get("start", 0)),
                "duration": float(e.get("duration", 0)),
                "text": str(e.get("text", "")),
            }
            for e in (transcript_entries or [])
        ]

    ytt_api = YouTubeTranscriptApi()
    try:
        transcript_list = ytt_api.fetch(video_id, proxies=proxies)
    except TypeError:
        transcript_list = ytt_api.fetch(video_id)
    print("YouTube transcript via youtube-transcript-api")
    return [
        {"start": float(entry.start), "duration": float(entry.duration), "text": str(entry.text)}
        for entry in transcript_list
    ]


def fetch_youtube_transcript(video_id: str) -> list:
    proxies = _proxy_dict_from_env()
    errors = []
    fetchers = [
        lambda: _fetch_transcript_via_innertube(video_id, proxies),
        lambda: _fetch_transcript_youtube_api(video_id, proxies),
        lambda: _fetch_transcript_via_piped(video_id, proxies),
        lambda: _fetch_transcript_via_invidious(video_id, proxies),
    ]
    if (os.getenv("SUPADATA_API_KEY") or "").strip():
        fetchers.append(lambda: _fetch_transcript_via_supadata(video_id))

    for fetch in fetchers:
        try:
            segments = fetch()
            if segments:
                return segments
        except Exception as e:
            errors.append(str(e))

    raise ValueError("; ".join(errors[-4:]))


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

def _strip_code_fences(s: str) -> str:
    t = (s or "").strip()
    if t.startswith("```json"):
        t = t.replace("```json", "", 1).strip()
    if t.startswith("```"):
        t = t.replace("```", "", 1).strip()
    if t.endswith("```"):
        t = t[:-3].strip()
    return t

def _fallback_graph_from_text(text: str) -> dict:
    raw = re.sub(r"[\[\]():,.;\"'`]+", " ", (text or "").lower())
    tokens = [t for t in raw.split() if 4 <= len(t) <= 20 and t.isascii()]
    stop = {
        "that","this","with","from","then","than","they","them","into","over","under","also","when","where","what",
        "your","have","will","could","should","would","about","between","there","their","which","because","using",
        "notes","snippet","youtube","student","context","core","concepts","main","ideas","detailed","explanation"
    }
    uniq = []
    seen = set()
    for tok in tokens:
        if tok in stop or tok.isdigit():
            continue
        if tok not in seen:
            seen.add(tok)
            uniq.append(tok)
        if len(uniq) >= 14:
            break

    if not uniq:
        uniq = ["learning", "concepts", "practice", "review"]

    nodes = [{"id": str(i + 1), "label": w.replace("_", " ").title(), "group": "concept"} for i, w in enumerate(uniq)]
    edges = []
    for i in range(len(nodes) - 1):
        edges.append({"source": nodes[i]["id"], "target": nodes[i + 1]["id"], "weight": 0.35})
    return {"nodes": nodes, "edges": edges}

@app.post("/api/ai/concept-graph")
async def concept_graph(req: ConceptGraphRequest):
    try:
        topic_id = req.topicId
        hint = (req.hint or "").strip()

        context = ""
        if topic_id is not None and str(topic_id).strip() != "":
            context = retrieve_context(topic_id, "core concepts, relationships, prerequisites, and next steps", k=20, context_mode=req.contextMode)

        base = (context or "").strip()
        if hint:
            base = (hint + "\n\n" + base).strip()

        if not base:
            g = _fallback_graph_from_text("study plan learning concepts practice review")
            return {"sourceHash": hashlib.sha256(b"empty").hexdigest(), "graph": g, "cached": False}

        source_hash = hashlib.sha256(base.encode("utf-8", errors="ignore")).hexdigest()

        prompt = f"""You are a knowledge-graph builder for a study assistant.
Given the notes/snippets below, extract a small concept graph that is useful for learning.

Return ONLY valid JSON (no markdown, no code fences) in this exact shape:
{{
  "nodes": [{{"id":"1","label":"Concept name","group":"concept"}}],
  "edges": [{{"source":"1","target":"2","weight":0.7}}]
}}

Rules:
- 8 to 18 nodes.
- node.id must be a short string (e.g. "1","2",...).
- edge.weight must be a number between 0.1 and 1.0.
- Prefer prerequisite/depends-on style links, but keep it general if unknown.
- Labels must be 2-6 words, Title Case.

Notes/snippets:
{base}
"""
        text_resp = call_openrouter(prompt).strip()
        text_resp = _strip_code_fences(text_resp)

        try:
            data = json.loads(text_resp)
            if not isinstance(data, dict) or "nodes" not in data or "edges" not in data:
                raise ValueError("missing keys")
            nodes = data.get("nodes") or []
            edges = data.get("edges") or []
            if not isinstance(nodes, list) or not isinstance(edges, list):
                raise ValueError("invalid shape")
            return {"sourceHash": source_hash, "graph": {"nodes": nodes, "edges": edges}, "cached": False}
        except Exception:
            g = _fallback_graph_from_text(base)
            return {"sourceHash": source_hash, "graph": g, "cached": False}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

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
        vectorstore = faiss_from_texts_rate_limited(chunks, embeddings)
        
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
        body = truncate_for_llm(req.text)
        prompt = f"""
        Summarize the following academic text in a clear, concise manner.
        Keep the summary informative and well-structured. Maximum 200 words.
        
        Text: {body}
        """
        text_resp = call_llm(prompt)
        return {"summary": text_resp.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/keypoints")
async def extract_keypoints(req: TextRequest):
    try:
        body = truncate_for_llm(req.text)
        prompt = f"""
        Extract the key points from the following academic text.
        You MUST return ONLY a valid JSON array of strings. Do not include markdown blocks like ```json.
        Example format: ["Point 1", "Point 2", "Point 3"]
        
        Text: {body}
        """
        text_resp = call_llm(prompt).strip()
        
        if text_resp.startswith("```json"):
            text_resp = text_resp.replace("```json", "").replace("```", "").strip()
            
        try:
            keypoints_list = json.loads(text_resp)
        except json.JSONDecodeError:
            keypoints_list = [line.strip("- *") for line in text_resp.split("\n") if line.strip()]

        return {"keyPoints": keypoints_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/task-ideas")
async def generate_task_ideas(req: TaskIdeasRequest):
    try:
        if not req.prompt or not req.prompt.strip():
            raise HTTPException(status_code=400, detail="Prompt is required.")
        
        prompt = f"""
        You are an expert academic study planner. Based on the user's input, generate exactly 4 concrete, actionable, and specific study task ideas.
        
        CRITICAL RULES:
        1. If the user's input is a specific topic (e.g., "DSA arrays"), your tasks MUST explicitly mention that topic so the user knows you understood them (e.g., "Make a 20-minute plan for reviewing DSA arrays").
        2. If the user's input is too vague, generic, or just a greeting (like "hi" or "hello"), generate tasks that playfully guide them to provide a specific topic (e.g., "Tell me what subject you want to tackle today", "List the key concepts of a specific subject you are studying").
        
        User input: "{req.prompt.strip()}"
        
        Return ONLY a valid JSON array of strings representing the 4 task ideas. Each string should be concise and start with an action verb (e.g., "Make a 20-minute plan...", "List key concepts..."). Do not include markdown blocks like ```json.
        """
        text_resp = call_groq(prompt).strip()
        
        if text_resp.startswith("```json"):
            text_resp = text_resp.replace("```json", "").replace("```", "").strip()
        elif text_resp.startswith("```"):
            text_resp = text_resp.replace("```", "").strip()
            
        try:
            ideas_list = json.loads(text_resp)
        except json.JSONDecodeError:
            ideas_list = [line.strip("- *") for line in text_resp.split("\n") if line.strip()]
            
        return {"ideas": ideas_list[:4]}
    except Exception as e:
        import traceback
        traceback.print_exc()
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
            segments = fetch_youtube_transcript(video_id)
            full_text = " ".join([s["text"] for s in segments])
        except Exception as transcript_err:
            msg = str(transcript_err)
            lower = msg.lower()
            blocked = (
                "too many requests" in lower
                or "blocked" in lower
                or ("ip" in lower and "block" in lower)
                or "captcha" in lower
                or "failed" in lower
            )
            if blocked:
                raise HTTPException(
                    status_code=503,
                    detail=(
                        "Could not fetch YouTube transcript. The video may have no captions, "
                        "or all transcript sources are temporarily unavailable. Try again later."
                    ),
                )
            raise HTTPException(
                status_code=400,
                detail=(
                    "Could not fetch transcript for this video. Enable captions on the video and try again. "
                    f"Error: {msg}"
                ),
            )

        if not full_text.strip():
            raise HTTPException(status_code=400, detail="The video transcript is empty. No content to embed.")

        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_text(full_text)

        embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=os.getenv("GEMINI_API_KEY"))
        vectorstore = faiss_from_texts_rate_limited(chunks, embeddings)

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
        summary = call_llm(summary_prompt).strip()

        chapters = []
        if segments:
            target = 8
            step = max(1, len(segments) // target)
            for i in range(0, len(segments), step):
                s = segments[i]
                label = re.sub(r"\s+", " ", s.get("text", "").strip())
                if len(label) > 48:
                    label = label[:45].rstrip() + "…"
                if not label:
                    label = f"Chapter {len(chapters) + 1}"
                chapters.append({"start": int(s.get("start", 0)), "label": label})
                if len(chapters) >= target:
                    break

        return {
            "status": "success",
            "chunks": len(chunks),
            "summary": summary,
            "chapters": chapters,
            "segments": segments[:1500],
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

        vectorstore = faiss_from_texts_rate_limited(chunks, embeddings)
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


@app.post("/api/ai/nex-guide")
async def nex_guide(req: NexGuideRequest):
    """Nex mascot website guide — maps user queries to the best LearNexus feature."""
    try:
        query = (req.query or "").strip()
        if not query:
            raise HTTPException(status_code=400, detail="query is required")

        current_path = (req.currentPath or "").strip()
        current_ctx = f"\nThe user is currently on the page: {current_path}" if current_path else ""

        prompt = f"""You are "Nex", a friendly, enthusiastic mascot guide for the LearNexus student learning platform.
A user is asking you a question about what the platform can do or where to go. Your job is to understand their intent and suggest the BEST matching feature from the platform.

Here is the complete list of LearNexus features/pages:

1. Dashboard (path: "/dashboard") — Overview of study progress, XP tracker, streaks, daily AI task suggestions, and quick-access widgets for all tools.
2. Explorer (path: "/explorer") — Browse all degrees, branches, semesters, and topics in the user's college. Find and open any study topic.
3. Upload Notes (path: "/upload") — Upload PDFs or images of handwritten/typed notes. Earns credits and builds a personal knowledge base that powers AI tools.
4. YouTube Learn (path: "/video-learn") — Paste any YouTube lecture link to get AI-generated summaries, chapter markers, and embed the transcript into study topics for AI tutoring.
5. AI Tutor (path: "/ai-tutor") — Full AI-powered learning suite: generates roadmaps, lectures, interactive chat, flashcards, exams, mind maps, and audio podcast overviews for any topic.
6. Nexus Board (path: "/nexus-board") — Community Q&A forum with topic rooms, bounty system, upvotes, and AI auto-answers. Ask or answer academic questions.
7. Nexus Library (path: "/nexus-library") — Browse and read community-shared blog posts, articles, and study materials.
8. Challenges (path: "/challenges") — Solve coding and academic challenges posted by companies. Earn credits and build your portfolio.
9. Profile (path: "/profile") — View your credits, upload history, XP, and account settings.
{current_ctx}

RULES:
1. Suggest exactly ONE primary feature that best matches the user's query. If a secondary feature is also relevant, mention it briefly.
2. Your "message" should be a warm, concise 1-3 sentence response as Nex the mascot. Be helpful and enthusiastic but not over-the-top. Use casual language.
3. If the user's query is a greeting or very vague, give a friendly welcome and highlight 2-3 key features they can explore.
4. If the query does not match any feature at all, still be helpful and suggest the Dashboard as a starting point.

You MUST respond with ONLY valid JSON (no markdown, no code fences) in exactly this shape:
{{
  "message": "Your friendly response as Nex",
  "suggestions": [
    {{
      "name": "Feature Name",
      "path": "/feature-path",
      "description": "One-line description of why this feature helps"
    }}
  ]
}}

The "suggestions" array should contain 1-3 items (the primary recommendation first, then optional secondary ones).

User query: "{query}"
"""
        text_resp = call_groq(prompt).strip()
        text_resp = _strip_code_fences(text_resp)

        try:
            data = json.loads(text_resp)
            if not isinstance(data, dict) or "message" not in data:
                raise ValueError("missing keys")
            if "suggestions" not in data or not isinstance(data.get("suggestions"), list):
                data["suggestions"] = [{"name": "Dashboard", "path": "/dashboard", "description": "Start here to see your overview"}]
            return data
        except (json.JSONDecodeError, ValueError):
            return {
                "message": text_resp[:300] if text_resp else "Hey! I'm Nex, your guide. Try asking me what you'd like to learn or do!",
                "suggestions": [
                    {"name": "Dashboard", "path": "/dashboard", "description": "Your home base — see progress, tasks, and quick links"},
                    {"name": "AI Tutor", "path": "/ai-tutor", "description": "AI-powered lectures, quizzes, and study tools"},
                ]
            }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    port = int(os.environ.get("PORT") or "5001")
    reload = os.environ.get("PORT") is None
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=reload)
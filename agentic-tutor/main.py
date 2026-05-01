"""
Agentic AI Tutor — FastAPI Entrypoint

Local default: port 5002 (TUTOR_PORT). On Render, bind to the platform PORT (never hardcode in Start Command).

Render Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
Do not set PORT manually in Render; the platform injects it. Do not use --port 5002 in production.
"""

import os
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn


_host_port = os.environ.get("PORT")
env_paths = [
    Path(__file__).parent.parent / "ai-backend-python" / ".env",
    Path(__file__).parent / ".env",
]
for env_path in env_paths:
    if env_path.exists():
        load_dotenv(env_path)
        break
if _host_port is not None:
    os.environ["PORT"] = _host_port
else:
    os.environ.pop("PORT", None)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-35s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("agentic_tutor")

for noisy in ["httpx", "httpcore", "openai", "litellm"]:
    logging.getLogger(noisy).setLevel(logging.WARNING)

app = FastAPI(
    title="Agentic AI Tutor",
    description=(
        "An AI-powered personalized tutoring system built with CrewAI Flows. "
        "Generates course roadmaps, delivers JIT lectures, resolves doubts, "
        "administers quizzes, and adapts schedules dynamically."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers.tutor_router import router as tutor_router
app.include_router(tutor_router)


@app.get("/")
async def root():
    return {
        "service": "Agentic AI Tutor",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running",
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT") or os.getenv("TUTOR_PORT") or "5002")
    reload = os.environ.get("PORT") is None
    logger.info(f"Starting Agentic AI Tutor on port {port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=reload)

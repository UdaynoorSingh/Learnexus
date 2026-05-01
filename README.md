# LearNexus

LearNexus is a multi-tenant student learning platform that combines:

- **Structured academic navigation** (Degree → Branch → Semester → Subject → Topic)
- **Notes upload + AI processing** (OCR → embeddings → summary/key points)
- **AI Tutor tools** (teach/chat/flashcards/exams/mindmaps/podcasts, YouTube transcript embedding)
- **Nexus Board** community Q&A (tags/rooms, bounties, moderation, bookmarks/upvotes)
- **Credits economy** (earn by uploading notes, spend to unlock content + AI features)

This repo contains **3 running services**:

- **Frontend**: `LearnNexus/frontend` (React + Vite)
- **Backend API**: `LearnNexus/backend` (Node.js + Express + Socket.IO + PostgreSQL)
- **AI services**:
  - `LearnNexus/ai-backend-python` (FastAPI: OCR, RAG/FAISS, moderation, tutor tools)
  - `LearnNexus/agentic-tutor` (FastAPI: CrewAI-based “agentic tutor” flows)

---

## Architecture (how it works end-to-end)

### Request flow

1. **User uses the web app** (React routes like `/upload`, `/ai-tutor`, `/nexus-board`).
2. Frontend calls **Backend API** at `http://localhost:5000/api` with `Authorization: Bearer <JWT>`.
3. Backend:
   - validates JWT and loads the user from Postgres
   - enforces **college scoping** (`college_id`) for almost all data
   - stores/retrieves data from **PostgreSQL**
   - triggers AI calls by proxying to the **AI backend** (`AI_BACKEND_URL`)
4. AI backend:
   - runs OCR on uploaded note images/PDFs (from Cloudinary URL)
   - builds/updates **FAISS** vector indexes per topic
   - generates summary/key points and powers RAG-style tutoring features
5. For long-running work (e.g., note processing), backend emits **Socket.IO** progress events to the user.

### Data storage layers

- **PostgreSQL** (system of record): users, colleges, academic catalog, notes metadata, community posts/comments, credits/transactions, dashboard state, challenges, etc.
- **Cloudinary** (file storage): uploaded PDFs/images and post images. URLs are stored in Postgres (e.g. `notes.file_url`).
- **FAISS indexes on disk** (AI backend): vector stores under `ai-backend-python/vector_stores/...` for topic notes, YouTube transcripts, and community solved-thread knowledge.

---

## Tech stack

### Frontend
- React + Vite
- React Router
- Axios
- Tailwind
- Socket.IO client

### Backend
- Node.js + Express
- Socket.IO
- PostgreSQL (`pg`)
- JWT auth
- Cloudinary uploads (multer + cloudinary storage)

### AI backend (`ai-backend-python`)
- FastAPI + Uvicorn
- Gemini embeddings (`models/gemini-embedding-001`)
- LLM calls via Groq/OpenRouter (OpenAI-compatible APIs)
- LangChain + FAISS (vector DB)
- YouTube transcript ingestion

### Agentic tutor (`agentic-tutor`)
- FastAPI + Uvicorn
- CrewAI flows + LiteLLM routing (provider fallback)

---

## Database (tables + how they relate)

Core multi-tenant model:

- `colleges` is the tenant boundary (based on `domain_suffix`).
- `users` belongs to a college (`users.college_id`).
- Academic hierarchy is scoped by `college_id`:
  - `degrees → branches → semesters → subjects → topics`
- Notes pipeline:
  - `notes` stores `file_url` (Cloudinary), plus `extracted_text`, `summary`, `key_points (JSONB)`, `quality_score`.
- Credits:
  - `users.credits` is the current balance
  - `transactions` is the ledger (why credits were added/used)
- Nexus Board:
  - `posts`, `comments` (threading via `comments.parent_comment_id`)
  - `post_upvotes`, `comment_upvotes`, `post_bookmarks`
  - `tags` tracks trending rooms (scoped per college or global)

Schema and migrations live in `LearnNexus/backend/db/`.

---

## Local development setup (Windows)

### Prerequisites
- **Node.js** (recommended: 18+)
- **Python** (recommended: 3.10+)
- **PostgreSQL** (local or hosted)

### 1) Database

Create a Postgres DB and set `DATABASE_URL` for the backend. Then initialize schema + migrations + seed:

```powershell
cd LearnNexus\backend
npm install
npm run db:init
```

`db:init` applies:
- `db/schema.sql`
- all `db/migrate_*.sql`
- `db/seed.sql`

### 2) Backend API (Express)

Create `LearnNexus/backend/.env` (you can start from `.env.example`).

Minimum required variables (example):

```env
PORT=5000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=change-me
DATABASE_URL=postgresql://postgres:password@localhost:5432/learnexus

# AI backend proxy
AI_BACKEND_URL=http://localhost:5001

# Cloudinary (required for notes upload)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Run:

```powershell
cd LearnNexus\backend
npm run dev
```

Backend health check:
- `GET /api/health`

### 3) AI backend (FastAPI, port 5001)

Create `LearnNexus/ai-backend-python/.env` (do **not** commit it).

Example:

```env
PORT=5001
GEMINI_API_KEY=your_key
GROQ_API_KEY=your_key
OPEN_ROUTER_API_KEY=your_key
```

Install and run:

```powershell
cd LearnNexus\ai-backend-python
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

AI health check:
- `GET /api/health`

### 4) Agentic tutor (FastAPI, port 5002)

This service powers the “Agentic AI Tutor” endpoints under `/tutor/*`.

```powershell
cd LearnNexus\agentic-tutor
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Tutor docs:
- `GET /docs`

### 5) Frontend (Vite, port 5173)

Create `LearnNexus/frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_API_BASE_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_TUTOR_API_URL=http://localhost:5002/tutor
```

Run:

```powershell
cd LearnNexus\frontend
npm install
npm run dev
```

---

## Key product flows (for evaluation/demo)

### Student login (OTP → JWT)
- Frontend calls `POST /api/auth/student-request-otp` then `POST /api/auth/student-verify-otp`.
- Backend stores OTPs in `student_signin_otps`, upserts `users`, and returns a JWT.
- Frontend stores the token and all subsequent calls include `Authorization: Bearer ...`.

### Upload notes → AI processing → credits
- Notes are uploaded via `/api/notes/upload` and stored in **Cloudinary**.
- Backend inserts a `notes` row and starts the AI pipeline:
  - `/api/ai/ocr` → extract text
  - `/api/ai/embed` → chunk + embed + write/merge FAISS indexes per `topicId`
  - `/api/ai/summarize` + `/api/ai/keypoints`
- Backend updates the `notes` record with extracted text + summary + key points, and awards credits in `users` + `transactions`.
- User gets live progress via Socket.IO events (`ai-progress`, `ai-success`, `ai-error`).

### AI Tutor (RAG over your notes + YouTube)
- AI endpoints are under `/api/ai/*` and are JWT-protected and verification-gated.
- Some endpoints deduct credits (e.g. exams/mindmaps/podcasts/YouTube embedding).
- YouTube ingestion stores transcript embeddings in `vector_stores/{topicId}/youtube_index`.

### Nexus Board (community)
- Posts and comments are moderated using the AI backend.
- Room tags can be auto-assigned by AI.
- When a bounty post is resolved, the accepted Q/A is ingested into a FAISS index for that room (“Room Mascot” can answer from solved threads).

---

## Deployment notes (high level)
- Backend and both FastAPI services support platform-provided `PORT` (Render-style).
- In production, set:
  - `FRONTEND_URL` correctly (CORS origin must match)
  - `DATABASE_URL` (managed Postgres recommended)
  - AI provider keys on the AI services
  - Cloudinary keys on backend

---

## Security / secrets (important)

Do **not** commit real `.env` files or API keys. If any keys were ever exposed, **rotate them** in the provider dashboards.

Recommended: add `.env` files to `.gitignore` and use `.env.example` templates only.


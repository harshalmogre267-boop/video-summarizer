# Video Summarizer Project Summary

## Project Name
Video Summarizer / TubeSense

## Purpose
A full-stack application that converts YouTube videos into structured learning assets using transcript extraction, semantic search, and Gemini-powered generative AI.

## Tech Stack
- Backend: Python, FastAPI
- Frontend: Next.js, React, TypeScript
- Database: SQLite via SQLAlchemy
- AI / Embeddings: Google Gemini API (`google-generativeai`)
- Transcript retrieval: `youtube-transcript-api`
- Auth: JWT + bcrypt

## Workspace Structure
```
backend/
  .env
  .env.example
  requirements.txt
  test_backend.py
  app/
    __init__.py
    auth.py
    config.py
    database.py
    main.py
    models.py
    routes/
      __init__.py
      auth.py
      history.py
      video.py
    services/
      __init__.py
      llm.py
      transcript.py
      vector_store.py
frontend/
  .gitignore
  AGENTS.md
  CLAUDE.md
  eslint.config.mjs
  next-env.d.ts
  next.config.ts
  package.json
  postcss.config.mjs
  README.md
  tsconfig.json
  public/
  src/
    app/
      globals.css
      layout.tsx
      page.tsx
      dashboard/page.tsx
      login/page.tsx
      register/page.tsx
      video/[id]/page.tsx
    components/
      Icons.tsx
      Navbar.tsx
    services/
      api.ts
```

## Backend Overview

### Entrypoint
- `backend/app/main.py`
  - Initializes FastAPI app
  - Creates DB tables on startup
  - Configures CORS
  - Includes routers:
    - `auth` -> `/api/auth`
    - `video` -> `/api/video`
    - `history` -> `/api/history`

### Configuration
- `backend/app/config.py`
  - Reads env vars from `.env`
  - Settings:
    - `DATABASE_URL`
    - `JWT_SECRET`
    - `JWT_ALGORITHM`
    - `ACCESS_TOKEN_EXPIRE_MINUTES`
    - `GEMINI_API_KEY`

- `backend/.env.example`
  - Example values for development

### Database
- `backend/app/database.py`
  - SQLAlchemy engine + session
  - SQLite support with `check_same_thread=False`
  - `get_db()` dependency for FastAPI

### Models
- `backend/app/models.py`
  - `User`
  - `Video`
  - `DocumentChunk`
  - `ChatMessage`
  - `Quiz`
  - `SocialContent`

### Authentication
- `backend/app/auth.py`
  - `hash_password` / `verify_password` with bcrypt
  - JWT creation and validation
  - `get_current_user` dependency for protected API routes

### API Routes
#### Auth routes (`backend/app/routes/auth.py`)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

#### History routes (`backend/app/routes/history.py`)
- `GET /api/history`
  - returns processed video history for current user

#### Video routes (`backend/app/routes/video.py`)
- `POST /api/video/process`
  - extracts video ID from URL
  - fetches transcript
  - scrapes metadata
  - stores video record
  - chunks transcript
  - creates embeddings
  - caches short summary
- `POST /api/video/summarize`
  - returns or generates `short`, `detailed`, or `bullet` summary
- `POST /api/video/notes`
  - returns or generates study notes
- `POST /api/video/quiz`
  - generates and caches quiz questions in JSON
- `POST /api/video/ask`
  - retrieves relevant transcript chunks via semantic search
  - produces RAG-style answer from Gemini
  - saves chat messages in DB
- `POST /api/video/content`
  - generates social media repurposed content
- `GET /api/video/{video_id}/chat-history`
  - returns stored chat message history

## Backend Services

### Transcript and metadata
- `backend/app/services/transcript.py`
  - `extract_video_id(url)`
  - `get_youtube_transcript(video_id)`
  - `get_video_metadata(video_id)`

### Vector store and search
- `backend/app/services/vector_store.py`
  - `chunk_text` splits transcript into overlapping text chunks
  - `get_embeddings_batch` creates embeddings with Gemini
  - `get_query_embedding` generates query embeddings
  - `search_similarity` computes cosine similarity for retrieval

### LLM generation
- `backend/app/services/llm.py`
  - `generate_summary`
  - `generate_study_notes`
  - `generate_quiz`
  - `answer_rag_question`
  - `generate_social_content`
  - Uses Gemini `models/gemini-1.5-flash`

## Backend Dependencies
From `backend/requirements.txt`:
- fastapi
- uvicorn
- sqlalchemy
- pydantic
- pydantic-settings
- google-generativeai
- youtube-transcript-api
- pyjwt
- bcrypt
- numpy
- python-dotenv
- requests
- email-validator

## Frontend Overview

### App Structure
- `frontend/src/app/page.tsx`
  - Landing page with feature overview and CTA
- `frontend/src/app/dashboard/page.tsx`
  - Dashboard UI for processing YouTube URLs and displaying history
- `frontend/src/app/login/page.tsx`
  - User login page
- `frontend/src/app/register/page.tsx`
  - New user registration page
- `frontend/src/app/video/[id]/page.tsx`
  - Video workspace page for summaries, notes, quiz, chat, and content
- `frontend/src/app/layout.tsx`
  - Global layout with `Navbar`
- `frontend/src/services/api.ts`
  - API client wrapper with authorization and Gemini key headers

### Client features
- Login / registration flow
- Store `auth_token` and `gemini_api_key` in `localStorage`
- Submit YouTube URL to backend
- View processed video history
- Fetch AI summaries, notes, quiz, social content
- Chat with the transcript using RAG retrieval

## Frontend Dependencies
From `frontend/package.json`:
- next
- react
- react-dom
- lucide-react
- tailwindcss
- eslint
- typescript
- @tailwindcss/postcss
- @types/node
- @types/react
- @types/react-dom

## Important Runtime Details
- Backend expects `GEMINI_API_KEY` either in environment or via request header `X-Gemini-API-Key`
- Frontend sends auth token as `Authorization: Bearer <token>`
- API base URL defaults to `http://localhost:8000/api`
- Video metadata is scraped from YouTube HTML and transcript retrieval requires captions/transcript availability
- SQLite is the default database

## How to Run

### Backend
1. Create/activate Python environment
2. Install requirements:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`
4. Start server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend
1. Change into `frontend`
2. Install packages:
   ```bash
   npm install
   ```
3. Start frontend:
   ```bash
   npm run dev
   ```

## Test Notes
- `backend/test_backend.py` includes a basic health check and auth cycle test
- It uses `sqlite:///./test_app.db` for test isolation

## High-Level Flow
1. User registers/logs in
2. User pastes a YouTube URL on dashboard
3. Backend extracts transcript and metadata
4. Backend stores video and creates embeddings
5. Initial summary is cached
6. User requests summaries, notes, quiz, chat, or social content
7. Backend uses Gemini and stored transcript data to generate results

## Recommended First Files to Examine
- `backend/app/routes/video.py`
- `backend/app/services/llm.py`
- `backend/app/services/transcript.py`
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/app/video/[id]/page.tsx`
- `frontend/src/services/api.ts`

# TubeSense - AI YouTube Video Summarizer

TubeSense is a full-stack web app that turns YouTube videos into structured learning assets. Paste a YouTube link, extract the transcript, generate summaries and study notes, create quizzes, chat with the video content, and repurpose the transcript into social content.

## Features

- User registration and login with JWT auth
- YouTube transcript extraction
- Video metadata lookup
- Gemini-powered summaries, notes, quizzes, chat answers, and social posts
- Transcript chunking and semantic search for RAG-style Q&A
- Video history dashboard
- Next.js frontend with FastAPI backend
- SQLite for local development, PostgreSQL-ready for production

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: FastAPI, SQLAlchemy, Pydantic
- Database: SQLite locally, PostgreSQL in production
- AI: Google Gemini API
- Transcript API: `youtube-transcript-api`

## Project Structure

```text
backend/
  app/
    main.py
    routes/
    services/
    models.py
    database.py
  requirements.txt
frontend/
  src/
    app/
    components/
    services/
  package.json
render.yaml
DEPLOYMENT.md
```

## Local Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Set these values in `backend/.env`:

```env
DATABASE_URL=sqlite:///./app.db
JWT_SECRET=change-this-to-a-long-random-secret
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=models/gemini-2.5-flash
```

Backend docs will be available at:

```text
http://127.0.0.1:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at:

```text
http://localhost:3000
```

For local development, the frontend defaults to:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Deployment

Recommended setup:

- Frontend: Vercel
- Backend: Render
- Database: Render PostgreSQL, Neon, or Supabase

See [DEPLOYMENT.md](DEPLOYMENT.md) for exact deployment settings.

## Important Notes

- Do not commit `backend/.env`; it contains secrets.
- Do not use SQLite for production persistence.
- Some YouTube videos may not have transcripts available.
- Gemini generation requires a valid Gemini API key.

## License

This project is currently private/unlicensed unless a license file is added.

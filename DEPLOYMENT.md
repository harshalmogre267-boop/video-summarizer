# Deployment Guide

Recommended production setup:

- Frontend: Vercel, rooted at `frontend`
- Backend: Render Web Service, rooted at `backend`
- Database: Render PostgreSQL via `DATABASE_URL`

## Backend on Render

Use the included `render.yaml` blueprint, or create a Web Service manually:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Environment variables:

```env
DATABASE_URL=<Render Postgres internal connection string>
JWT_SECRET=<long random secret>
GEMINI_API_KEY=<your Gemini API key>
GEMINI_MODEL=models/gemini-2.5-flash
```

## Frontend on Vercel

Import the same Git repository and set:

- Root directory: `frontend`
- Framework preset: Next.js

Environment variable:

```env
NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com/api
```

After the Render backend deploys, copy its public URL and update `NEXT_PUBLIC_API_URL` in Vercel.

## Notes

- Do not deploy the local `backend/.env` file or SQLite database.
- SQLite is fine locally; production should use PostgreSQL.
- Keep `GEMINI_API_KEY` only in hosting environment variables.

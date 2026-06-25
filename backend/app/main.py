from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import auth, video, history

# Initialize SQLite database and create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="YouTube Summarizer API",
    description="Backend API for the YouTube Summarizer & Knowledge Assistant",
    version="1.0"
)

# Configure CORS to allow access from local frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production environments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(auth.router, prefix="/api")
app.include_router(video.router, prefix="/api")
app.include_router(history.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "AI-Powered YouTube Video Summarizer & Knowledge Assistant API"
    }

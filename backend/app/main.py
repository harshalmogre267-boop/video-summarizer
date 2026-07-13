from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.routes import auth, video, history
from app.models import User
from app.auth import ANONYMOUS_USER_ID
from app.config import settings

# Initialize SQLite database and create tables
Base.metadata.create_all(bind=engine)

# Create anonymous user if it doesn't exist
db = SessionLocal()
try:
    anonymous_user = db.query(User).filter(User.id == ANONYMOUS_USER_ID).first()
    if not anonymous_user:
        anonymous_user = User(
            id=ANONYMOUS_USER_ID,
            name="Anonymous User",
            email="anonymous@localhost",
            password_hash="disabled"
        )
        db.add(anonymous_user)
        db.commit()
finally:
    db.close()

app = FastAPI(
    title="YouTube Summarizer API",
    description="Backend API for the YouTube Summarizer & Knowledge Assistant",
    version="1.0"
)

allowed_origins = [
    origin.strip()
    for origin in settings.FRONTEND_ORIGINS.split(",")
    if origin.strip()
]

# Configure CORS to allow access from local and configured production frontends.
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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

@app.get("/api/health")
def read_api_health():
    return read_root()

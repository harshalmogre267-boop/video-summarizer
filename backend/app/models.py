from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    videos = relationship("Video", back_populates="user", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")

class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(String, index=True, nullable=False)  # YouTube Video ID (e.g. dQw4w9WgXcQ)
    title = Column(String, nullable=False)
    author = Column(String, nullable=True)
    thumbnail = Column(String, nullable=True)
    duration = Column(Integer, nullable=True)  # in seconds
    youtube_url = Column(String, nullable=False)
    transcript = Column(Text, nullable=False)
    
    # Cached AI summaries
    summary_short = Column(Text, nullable=True)
    summary_detailed = Column(Text, nullable=True)
    summary_bullet = Column(Text, nullable=True)
    
    # Cached study notes
    generated_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="videos")
    chunks = relationship("DocumentChunk", back_populates="video", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="video", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="video", cascade="all, delete-orphan")
    social_content = relationship("SocialContent", back_populates="video", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Text, nullable=False)  # JSON-serialized list of floats (e.g. "[0.1, 0.2, ...]")

    video = relationship("Video", back_populates="chunks")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sender = Column(String, nullable=False)  # "user" or "assistant"
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    video = relationship("Video", back_populates="chat_messages")
    user = relationship("User", back_populates="chat_messages")

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    questions_json = Column(Text, nullable=False)  # JSON-serialized list of questions
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    video = relationship("Video", back_populates="quizzes")

class SocialContent(Base):
    __tablename__ = "social_contents"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    linkedin_post = Column(Text, nullable=True)
    twitter_thread = Column(Text, nullable=True)
    blog_post = Column(Text, nullable=True)
    instagram_carousel = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    video = relationship("Video", back_populates="social_content")

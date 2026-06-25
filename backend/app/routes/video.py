import json
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import Video, DocumentChunk, ChatMessage, Quiz, SocialContent, User
from app.auth import get_current_user
from app.config import settings
from app.services.transcript import extract_video_id, get_youtube_transcript, get_video_metadata
from app.services.vector_store import chunk_text, get_embeddings_batch, search_similarity
from app.services.llm import generate_summary, generate_study_notes, generate_quiz, answer_rag_question, generate_social_content

router = APIRouter(prefix="/video", tags=["video"])

class ProcessRequest(BaseModel):
    youtube_url: str

class SummarizeRequest(BaseModel):
    video_id: int  # DB Video ID
    summary_type: str  # "short", "detailed", or "bullet"

class AskRequest(BaseModel):
    video_id: int  # DB Video ID
    question: str

class NotesRequest(BaseModel):
    video_id: int  # DB Video ID

class QuizRequest(BaseModel):
    video_id: int  # DB Video ID

class ContentRequest(BaseModel):
    video_id: int  # DB Video ID

INVALID_GEMINI_KEYS = {
    "",
    "AIzaSyYourGeminiApiKeyHere",
    "your-gemini-api-key",
    "your_gemini_api_key",
}

def get_api_key(x_gemini_api_key: str = Header(None)) -> str:
    """
    Retrieves Gemini API key. Prioritizes the request header, then config settings.
    """
    key = (x_gemini_api_key or settings.GEMINI_API_KEY or "").strip()
    if key in INVALID_GEMINI_KEYS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "A valid Gemini API key is required. Add one in the navbar Settings "
                "modal, or set GEMINI_API_KEY in backend/.env and restart the backend."
            )
        )
    return key

@router.post("/process")
def process_video(
    req: ProcessRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    api_key: str = Depends(get_api_key)
):
    try:
        video_id_str = extract_video_id(req.youtube_url)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        
    # Check if this user has already processed this video
    existing_video = db.query(Video).filter(
        Video.video_id == video_id_str,
        Video.user_id == current_user.id
    ).first()
    
    if existing_video:
        return existing_video
        
    # Process from scratch
    # 1. Fetch transcript
    try:
        transcript_text = get_youtube_transcript(video_id_str)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        
    # 2. Scrape metadata
    metadata = get_video_metadata(video_id_str)
    
    # 3. Save Video entry
    db_video = Video(
        video_id=video_id_str,
        title=metadata["title"],
        author=metadata["author"],
        thumbnail=metadata["thumbnail"],
        duration=metadata["duration"],
        youtube_url=metadata["youtube_url"],
        transcript=transcript_text,
        user_id=current_user.id
    )
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    
    # 4. Generate chunks & embeddings for vector search
    try:
        chunks = chunk_text(transcript_text, chunk_size=1000, overlap=200)
        if chunks:
            # Batch generate embeddings
            embeddings = get_embeddings_batch(chunks, api_key)
            
            # Save chunks to DB
            for idx, (chunk_content, emb) in enumerate(zip(chunks, embeddings)):
                db_chunk = DocumentChunk(
                    video_id=db_video.id,
                    chunk_index=idx,
                    content=chunk_content,
                    embedding=json.dumps(emb)
                )
                db.add(db_chunk)
            db.commit()
    except Exception as e:
        # If vector chunking fails, log it but don't fail the entire process
        print(f"Error indexing video: {e}")
        
    # 5. Pre-generate and cache short summary
    try:
        short_summary = generate_summary(transcript_text, "short", api_key)
        db_video.summary_short = short_summary
        db.commit()
        db.refresh(db_video)
    except Exception as e:
        print(f"Error generating default summary: {e}")
        
    return db_video

@router.post("/summarize")
def summarize_video(
    req: SummarizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    api_key: str = Depends(get_api_key)
):
    video = db.query(Video).filter(Video.id == req.video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
        
    # Check if cached
    if req.summary_type == "short" and video.summary_short:
        return {"summary": video.summary_short, "type": req.summary_type}
    elif req.summary_type == "detailed" and video.summary_detailed:
        return {"summary": video.summary_detailed, "type": req.summary_type}
    elif req.summary_type == "bullet" and video.summary_bullet:
        return {"summary": video.summary_bullet, "type": req.summary_type}
        
    # Generate on the fly
    try:
        summary_text = generate_summary(video.transcript, req.summary_type, api_key)
        
        # Cache it
        if req.summary_type == "short":
            video.summary_short = summary_text
        elif req.summary_type == "detailed":
            video.summary_detailed = summary_text
        elif req.summary_type == "bullet":
            video.summary_bullet = summary_text
            
        db.commit()
        return {"summary": summary_text, "type": req.summary_type}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/notes")
def get_notes(
    req: NotesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    api_key: str = Depends(get_api_key)
):
    video = db.query(Video).filter(Video.id == req.video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
        
    if video.generated_notes:
        return {"notes": video.generated_notes}
        
    try:
        notes = generate_study_notes(video.transcript, api_key)
        video.generated_notes = notes
        db.commit()
        return {"notes": notes}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/quiz")
def get_quiz(
    req: QuizRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    api_key: str = Depends(get_api_key)
):
    video = db.query(Video).filter(Video.id == req.video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
        
    # Check if cached
    quiz = db.query(Quiz).filter(Quiz.video_id == video.id).first()
    if quiz:
        return {"questions": json.loads(quiz.questions_json)}
        
    try:
        quiz_json_str = generate_quiz(video.transcript, api_key)
        
        # Verify JSON
        parsed_questions = json.loads(quiz_json_str)
        
        # Save to DB
        db_quiz = Quiz(
            video_id=video.id,
            questions_json=quiz_json_str
        )
        db.add(db_quiz)
        db.commit()
        
        return {"questions": parsed_questions}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/ask")
def ask_question(
    req: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    api_key: str = Depends(get_api_key)
):
    video = db.query(Video).filter(Video.id == req.video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
        
    # Get all document chunks with embeddings
    chunks = db.query(DocumentChunk).filter(DocumentChunk.video_id == video.id).all()
    if not chunks:
        # If no chunks exist, re-chunk and embedding indexing (fallback)
        try:
            chunk_texts = chunk_text(video.transcript, chunk_size=1000, overlap=200)
            if chunk_texts:
                embeddings = get_embeddings_batch(chunk_texts, api_key)
                for idx, (chunk_c, emb) in enumerate(zip(chunk_texts, embeddings)):
                    db_chunk = DocumentChunk(
                        video_id=video.id,
                        chunk_index=idx,
                        content=chunk_c,
                        embedding=json.dumps(emb)
                    )
                    db.add(db_chunk)
                db.commit()
                chunks = db.query(DocumentChunk).filter(DocumentChunk.video_id == video.id).all()
        except Exception:
            pass
            
    # Vector Search
    relevant_chunks = []
    if chunks:
        relevant_chunks = search_similarity(req.question, chunks, api_key, top_k=4)
    else:
        # If still no chunks, fall back to matching by string inside transcript
        relevant_chunks = [{"chunk_index": 0, "content": video.transcript[:2000], "similarity": 1.0}]
        
    # Retrieve past 6 chat messages as context
    history = db.query(ChatMessage).filter(
        ChatMessage.video_id == video.id,
        ChatMessage.user_id == current_user.id
    ).order_by(ChatMessage.created_at.desc()).limit(6).all()
    
    # Reverse history list to preserve chronological order
    history.reverse()
    chat_history_list = [{"sender": msg.sender, "message": msg.message} for msg in history]
    
    # Query Gemini
    try:
        answer = answer_rag_question(req.question, relevant_chunks, chat_history_list, api_key)
        
        # Save Q&A to database history
        user_msg = ChatMessage(video_id=video.id, user_id=current_user.id, sender="user", message=req.question)
        assistant_msg = ChatMessage(video_id=video.id, user_id=current_user.id, sender="assistant", message=answer)
        db.add(user_msg)
        db.add(assistant_msg)
        db.commit()
        
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/content")
def repurpose_content(
    req: ContentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    api_key: str = Depends(get_api_key)
):
    video = db.query(Video).filter(Video.id == req.video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
        
    social = db.query(SocialContent).filter(SocialContent.video_id == video.id).first()
    if social:
        return {
            "linkedin_post": social.linkedin_post,
            "twitter_thread": social.twitter_thread,
            "blog_post": social.blog_post,
            "instagram_carousel": social.instagram_carousel
        }
        
    try:
        res_dict = generate_social_content(video.transcript, api_key)
        
        db_social = SocialContent(
            video_id=video.id,
            linkedin_post=res_dict.get("linkedin_post"),
            twitter_thread=res_dict.get("twitter_thread"),
            blog_post=res_dict.get("blog_post"),
            instagram_carousel=res_dict.get("instagram_carousel")
        )
        db.add(db_social)
        db.commit()
        
        return res_dict
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{video_id}/chat-history")
def get_chat_history(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
        
    messages = db.query(ChatMessage).filter(
        ChatMessage.video_id == video_id,
        ChatMessage.user_id == current_user.id
    ).order_by(ChatMessage.created_at.asc()).all()
    
    return [{"sender": m.sender, "message": m.message, "created_at": m.created_at} for m in messages]

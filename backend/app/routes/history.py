from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user
from app.models import Video, User

router = APIRouter(prefix="/history", tags=["history"])

@router.get("")
def get_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Returns history of processed videos for the currently logged in user.
    """
    videos = db.query(Video).filter(
        Video.user_id == current_user.id
    ).order_by(Video.created_at.desc()).all()
    
    return [
        {
            "id": v.id,
            "video_id": v.video_id,
            "title": v.title,
            "author": v.author,
            "thumbnail": v.thumbnail,
            "duration": v.duration,
            "youtube_url": v.youtube_url,
            "created_at": v.created_at,
            "has_short_summary": v.summary_short is not None,
            "has_detailed_summary": v.summary_detailed is not None,
            "has_bullet_summary": v.summary_bullet is not None,
            "has_notes": v.generated_notes is not None
        }
        for v in videos
    ]

import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)
ANONYMOUS_USER_ID = 1  # Default anonymous user ID

def hash_password(password: str) -> str:
    # bcrypt requires bytes
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    # If no token provided, return the anonymous user
    if not token:
        user = db.query(User).filter(User.id == ANONYMOUS_USER_ID).first()
        if user:
            return user
        # Create anonymous user if it doesn't exist
        anon_user = User(
            id=ANONYMOUS_USER_ID,
            name="Anonymous User",
            email="anonymous@localhost",
            password_hash="disabled"
        )
        db.add(anon_user)
        db.commit()
        db.refresh(anon_user)
        return anon_user
    
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            # Token invalid, return anonymous user
            user = db.query(User).filter(User.id == ANONYMOUS_USER_ID).first()
            if user:
                return user
    except jwt.PyJWTError:
        # Token error, return anonymous user
        user = db.query(User).filter(User.id == ANONYMOUS_USER_ID).first()
        if user:
            return user
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        # Unknown user, return anonymous
        user = db.query(User).filter(User.id == ANONYMOUS_USER_ID).first()
        if user:
            return user
    return user

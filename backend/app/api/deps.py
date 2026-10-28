from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.config import settings
from app.models.entities import User
from app.api.auth import current_user


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    if settings.allow_demo_auth and request.headers.get("X-User-Id"):
        try:
            user = db.get(User, int(request.headers["X-User-Id"]))
        except ValueError:
            user = None
        if user:
            return user
        raise HTTPException(401, "演示用户不存在")
    return current_user(request, db)

import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.api.auth import current_user
from app.core.db import get_db
from app.models.entities import User
from app.models.account import UserData, BadgeAward
from app.services.badges import CATALOG, grant, metrics

router = APIRouter(prefix="/badges", tags=["badges"])


@router.get("")
def list_badges(user: User = Depends(current_user), db: Session = Depends(get_db)):
    record = db.get(UserData, user.id)
    data = json.loads(record.payload) if record else {}
    # Backfill existing users from their history; never trust award flags from clients.
    grant(user.id, data, db)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()  # A concurrent successful sync may have granted the same badge.
    awards = {
        r.badge_id: r.earned_at.isoformat() + "Z"
        for r in db.query(BadgeAward).filter_by(user_id=user.id)
    }
    stats = metrics(data)
    return {
        "items": [
            {**b, "current": stats[b["metric"]], "earned_at": awards.get(b["id"])}
            for b in CATALOG
        ],
        "stats": stats,
        "earned_count": len(awards),
    }

import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import update
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.api.auth import current_user
from app.core.db import get_db
from app.models.entities import User
from app.models.account import UserData, BadgeAward, BadgeProfile
from app.services.badges import CATALOG, grant, metrics, weekly_goals

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
    profile = db.get(BadgeProfile, user.id)
    stats = metrics(data)
    return {
        "items": [
            {**b, "current": stats[b["metric"]], "earned_at": awards.get(b["id"])}
            for b in CATALOG
        ],
        "stats": stats,
        "earned_count": len(awards),
        "featured_id": profile.featured_id if profile else None,
        "weekly_goals": weekly_goals(data),
    }


class FeaturedBadge(BaseModel):
    badge_id: str | None = Field(default=None, max_length=64)


@router.put("/featured")
def feature(
    body: FeaturedBadge,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if body.badge_id is not None:
        if not any(b["id"] == body.badge_id for b in CATALOG) or not db.get(
            BadgeAward, (user.id, body.badge_id)
        ):
            raise HTTPException(403, "只能佩戴自己已获得的徽章")
    updated = db.execute(
        update(BadgeProfile)
        .where(BadgeProfile.user_id == user.id)
        .values(featured_id=body.badge_id)
    )
    if not updated.rowcount:
        try:
            db.add(BadgeProfile(user_id=user.id, featured_id=body.badge_id))
            db.commit()
        except IntegrityError:
            db.rollback()
            db.execute(
                update(BadgeProfile)
                .where(BadgeProfile.user_id == user.id)
                .values(featured_id=body.badge_id)
            )
            db.commit()
    else:
        db.commit()
    return {"featured_id": body.badge_id}

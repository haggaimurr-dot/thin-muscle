from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.entities import User
from app.models.notifications import Notification

router = APIRouter(prefix="/notifications", tags=["notifications"])
DB = Annotated[Session, Depends(get_db)]
Member = Annotated[User, Depends(get_current_user)]


@router.get("")
def list_notifications(
    user: Member,
    db: DB,
    before: int | None = Query(default=None, ge=1),
    limit: int = Query(default=30, ge=1, le=100),
):
    query = db.query(Notification).filter_by(user_id=user.id)
    rows = (
        query.filter(Notification.id < before if before else True)
        .order_by(Notification.id.desc())
        .limit(limit + 1)
        .all()
    )
    more = len(rows) > limit
    rows = rows[:limit]
    return {
        "unread": query.filter_by(read=False).count(),
        "next_cursor": rows[-1].id if more else None,
        "items": [
            {
                "id": r.id,
                "actor": (
                    db.get(User, r.actor_id).nickname
                    if db.get(User, r.actor_id)
                    else "已注销用户"
                ),
                "kind": r.kind,
                "target_kind": r.target_kind,
                "target_id": r.target_id,
                "read": r.read,
                "created_at": r.created_at.isoformat() + "Z",
            }
            for r in rows
        ],
    }


@router.post("/{notification_id}/read")
def read_one(notification_id: int, user: Member, db: DB):
    row = db.get(Notification, notification_id)
    if not row or row.user_id != user.id:
        raise HTTPException(404, "通知不存在")
    row.read = True
    db.commit()
    return {"ok": True}


@router.post("/read-all")
def read_all(user: Member, db: DB):
    db.query(Notification).filter_by(user_id=user.id, read=False).update({"read": True})
    db.commit()
    return {"ok": True}

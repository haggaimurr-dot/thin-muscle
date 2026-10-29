from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.entities import User, MarketComment, MarketListing
from app.models.moderation import MarketReply, ReviewState, ReviewLog, ContentReport
from app.models.notifications import Notification
from app.schemas.market import CommentCreate
from app.services.market import get_listing
from app.services.moderation import is_admin
from app.services.notifications import add_notification

router = APIRouter(prefix="/market", tags=["replies"])
DB = Annotated[Session, Depends(get_db)]
Member = Annotated[User, Depends(get_current_user)]


@router.delete("/comments/{comment_id}")
def remove_comment(comment_id: int, user: Member, db: DB):
    row = db.get(MarketComment, comment_id)
    if not row:
        raise HTTPException(404, "留言不存在")
    listing = db.get(MarketListing, row.listing_id)
    if user.id not in (row.user_id, listing.seller_id) and not is_admin(user):
        raise HTTPException(403, "无权删除留言")
    replies = [r.id for r in db.query(MarketReply.id).filter_by(comment_id=comment_id)]
    for kind, ids in [("market_comment", [comment_id]), ("market_reply", replies)]:
        db.query(ReviewState).filter(
            ReviewState.kind == kind, ReviewState.target_id.in_(ids)
        ).delete(synchronize_session=False)
        db.query(ContentReport).filter(
            ContentReport.kind == kind, ContentReport.target_id.in_(ids)
        ).update({"status": "deleted"}, synchronize_session=False)
    for event in [
        "market_comment:" + str(comment_id),
        *["reply:" + str(i) for i in replies],
    ]:
        db.query(Notification).filter(
            Notification.event_key.endswith(":" + event)
        ).delete(synchronize_session=False)
    db.query(MarketReply).filter_by(comment_id=comment_id).delete()
    db.add(
        ReviewLog(
            actor_id=user.id,
            kind="market_comment_delete",
            target_id=comment_id,
            hidden=True,
        )
    )
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.post("/comments/{comment_id}/replies")
def reply(comment_id: int, body: CommentCreate, user: Member, db: DB):
    parent = db.get(MarketComment, comment_id)
    state = db.get(ReviewState, ("market_comment", comment_id))
    if not parent or (state and state.hidden):
        raise HTTPException(404, "留言不存在或已隐藏")
    listing, _ = get_listing(db, parent.listing_id)
    row = MarketReply(comment_id=comment_id, user_id=user.id, text=body.text)
    db.add(row)
    db.flush()
    for recipient in {parent.user_id, listing.seller_id}:
        add_notification(
            db, recipient, user.id, "reply", "market", listing.id, f"reply:{row.id}"
        )
    db.commit()
    return {"id": row.id}


@router.delete("/replies/{reply_id}")
def remove(reply_id: int, user: Member, db: DB):
    row = db.get(MarketReply, reply_id)
    if not row:
        raise HTTPException(404, "回复不存在")
    parent = db.get(MarketComment, row.comment_id)
    listing, _ = get_listing(db, parent.listing_id)
    if row.user_id != user.id and listing.seller_id != user.id and not is_admin(user):
        raise HTTPException(403, "无权删除回复")
    db.query(ReviewState).filter_by(kind="market_reply", target_id=reply_id).delete()
    db.query(ContentReport).filter_by(kind="market_reply", target_id=reply_id).update(
        {"status": "deleted"}
    )
    db.query(Notification).filter(
        Notification.event_key.endswith(":reply:" + str(reply_id))
    ).delete(synchronize_session=False)
    db.add(
        ReviewLog(
            actor_id=user.id,
            kind="market_reply_delete",
            target_id=reply_id,
            hidden=True,
        )
    )
    db.delete(row)
    db.commit()
    return {"ok": True}

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.entities import User
from app.services import home as svc
import json
from datetime import datetime
from fastapi import HTTPException
from app.models.home import FeedPost, FeedLike, FeedComment
from app.models.moderation import ReviewState, ContentReport
from app.models.notifications import Notification

router = APIRouter(prefix="/home", tags=["home"])


class CommentIn(BaseModel):
    text: str = Field(min_length=1, max_length=500)

    @field_validator("text")
    @classmethod
    def clean_text(cls, value):
        value = value.strip()
        if not value or any(ord(c) < 32 and c not in "\n\r\t" for c in value):
            raise ValueError("留言不能为空或包含控制字符")
        return value


class PostIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


@router.post("/posts")
def publish_post(
    body: PostIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    text = body.text.strip()
    if not text or any(ord(c) < 32 and c not in "\n\r\t" for c in text):
        raise HTTPException(422, "动态内容不能为空或包含控制字符")
    from app.models.account import LoginAttempt

    key = f"post:{user.id}:{datetime.utcnow().date()}"
    quota = db.get(LoginAttempt, key)
    if quota and quota.count >= 20:
        raise HTTPException(429, "今日动态发布已达20条，请明天再试")
    if not quota:
        quota = LoginAttempt(key=key, count=0)
        db.add(quota)
    quota.count += 1
    post = FeedPost(
        user_id=user.id,
        week_id=svc.monday_ymd(),
        gains_json=json.dumps([{"text": text}], ensure_ascii=False),
    )
    db.add(post)
    db.commit()
    return {"post_id": post.id}


@router.delete("/feed/{post_id}")
def delete_post(
    post_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    post = db.get(FeedPost, post_id)
    if not post or post.user_id != user.id:
        raise HTTPException(404, "动态不存在或无权删除")
    comments = [c.id for c in db.query(FeedComment.id).filter_by(post_id=post_id)]
    db.query(Notification).filter_by(target_kind="post", target_id=post_id).delete()
    db.query(FeedLike).filter_by(post_id=post_id).delete()
    db.query(FeedComment).filter_by(post_id=post_id).delete()
    db.query(ReviewState).filter(
        ReviewState.kind == "feed_comment", ReviewState.target_id.in_(comments)
    ).delete(synchronize_session=False)
    db.query(ReviewState).filter_by(kind="post", target_id=post_id).delete()
    db.query(ContentReport).filter_by(kind="post", target_id=post_id).update(
        {"status": "deleted"}
    )
    db.query(ContentReport).filter(
        ContentReport.kind == "feed_comment", ContentReport.target_id.in_(comments)
    ).update({"status": "deleted"}, synchronize_session=False)
    db.delete(post)
    db.commit()
    return {"ok": True}


@router.get("/stats")
def home_stats(
    period: str = Query(default="week", description="week|month"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return svc.my_stats(db, user, period=period)


@router.get("/rank")
def home_rank(
    dim: str = Query(
        default="strength", description="strength|overload|protein|streak|weight_class"
    ),
    period: str = Query(default="week", description="week|month"),
    scope: str = Query(default="public", pattern="^(public|friends)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return svc.rank(db, user, dim=dim, period=period, scope=scope)


@router.post("/rank/refresh")
def refresh_rank(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """系统/运维触发：强制刷新本小时快照。定时任务每小时调一次即可。"""
    from app.services.moderation import is_admin

    if not is_admin(user):
        raise HTTPException(403, "仅管理员可刷新排行快照")
    return svc.refresh_rank_snapshots(db)


@router.get("/follows")
def my_follows(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return {"items": svc.list_following(db, user)}


@router.get("/discover")
def discover(
    q: str = Query(default="", max_length=64),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return {"items": svc.discover_users(db, user, q)}


@router.post("/follows/{followee_id}")
def follow_toggle(
    followee_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return svc.toggle_follow(db, user, followee_id)


@router.get("/feed")
def home_feed(
    before: int | None = Query(default=None, ge=1),
    limit: int = Query(default=20, ge=1, le=50),
    scope: str = Query(default="following", pattern="^(following|all)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return svc.feed(db, user, before, limit, scope)


@router.post("/feed/{post_id}/like")
def feed_like(
    post_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return svc.toggle_feed_like(db, user, post_id)


@router.post("/feed/{post_id}/comments")
def feed_comment(
    post_id: int,
    body: CommentIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return svc.add_feed_comment(db, user, post_id, body.text)

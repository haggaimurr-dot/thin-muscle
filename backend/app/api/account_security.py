import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import delete, or_, update
from sqlalchemy.orm import Session

from app.api.auth import COOKIE, current_user, password_hash, rate_limit
from app.core.config import settings
from app.core.db import get_db
from app.models.account import (
    Account,
    AccountToken,
    BadgeAward,
    ExternalIdentity,
    LoginSession,
    PaymentOrder,
    RecoveryEmail,
    TrainingPhoto,
    UserData,
)
from app.models.entities import (
    AssembledPlan,
    MarketComment,
    MarketLike,
    MarketListing,
    Purchase,
    TrainingNode,
    User,
)
from app.models.home import (
    FeedComment,
    FeedLike,
    FeedPost,
    Follow,
    RankSnapshot,
    WeekStat,
)
from app.services import mail
from app.services.account_lock import lock_account
from app.models.account import WorkFavorite
from app.models.moderation import ContentReport, ReviewState
from app.models.moderation import MarketReply
from app.models.notifications import Notification
from app.models.account import RankPrivacy
from app.models.account import (
    NodePreference,
    DataMeta,
    ReminderSetting,
    ReminderDelivery,
)

router = APIRouter(prefix="/auth", tags=["account security"])
DB = Annotated[Session, Depends(get_db)]
Member = Annotated[User, Depends(current_user)]


def utcnow():
    # Existing SQLite columns store naive UTC values.
    return datetime.now(UTC).replace(tzinfo=None)


class CurrentPassword(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)


class ChangePassword(CurrentPassword):
    new_password: str = Field(min_length=10, max_length=128)


class EmailAddress(BaseModel):
    email: str = Field(max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

    @field_validator("email", mode="before")
    @classmethod
    def normalize(cls, value):
        return value.strip().lower() if isinstance(value, str) else value


class BindEmail(EmailAddress, CurrentPassword):
    pass


class ForgotPassword(EmailAddress):
    username: str = Field(min_length=3, max_length=32, pattern=r"^[A-Za-z0-9_]+$")


class TokenBody(BaseModel):
    token: str = Field(min_length=32, max_length=128)


class ResetPassword(TokenBody):
    new_password: str = Field(min_length=10, max_length=128)


class DeleteAccount(CurrentPassword):
    confirmation: Literal["注销我的账号"]


def account_for(user, password, db):
    account = db.query(Account).filter_by(user_id=user.id).first()
    if not account:
        raise HTTPException(400, "此账号没有密码登录方式")
    if not hmac.compare_digest(
        password_hash(password, account.password_hash.split(":")[0]),
        account.password_hash,
    ):
        raise HTTPException(400, "当前密码不正确")
    return account


def clear_cookie(response):
    response.delete_cookie(
        COOKIE, path="/", secure=settings.cookie_secure, samesite="lax"
    )


def revoke(user_id, db):
    db.query(LoginSession).filter_by(user_id=user_id).delete()
    db.query(AccountToken).filter_by(user_id=user_id).delete()


@router.get("/security")
def security(user: Member, db: DB):
    address = db.get(RecoveryEmail, user.id)
    has_password = db.query(Account.id).filter_by(user_id=user.id).first() is not None
    return {
        "has_password": has_password,
        "recovery_email": address.email if address else None,
        "email_available": mail.ready(),
    }


@router.post("/password/change")
def change_password(
    body: ChangePassword, request: Request, response: Response, user: Member, db: DB
):
    rate_limit(request, db)
    account = account_for(user, body.current_password, db)
    if body.new_password == body.current_password:
        raise HTTPException(422, "新密码不能与当前密码相同")
    result = db.execute(
        update(Account)
        .where(Account.id == account.id, Account.password_hash == account.password_hash)
        .values(password_hash=password_hash(body.new_password))
    )
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(409, "账号已更新，请重新登录后重试")
    revoke(user.id, db)
    db.commit()
    clear_cookie(response)
    return {"ok": True}


def send_token(user_id, address, purpose, db):
    if not mail.ready():
        raise HTTPException(503, "邮件服务尚未配置")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(400, "账号不可用")
    lock_account(user, db)
    if not db.query(Account).filter_by(user_id=user_id).first():
        raise HTTPException(400, "账号不可用")
    if purpose == "reset_password":
        recovery = db.get(RecoveryEmail, user_id)
        if not recovery or recovery.email != address:
            raise HTTPException(400, "恢复邮箱已变更，请重新申请")
    token = secrets.token_urlsafe(32)
    digest = hashlib.sha256(token.encode()).hexdigest()
    db.query(AccountToken).filter_by(user_id=user_id, purpose=purpose).delete()
    db.add(
        AccountToken(
            digest=digest,
            user_id=user_id,
            email=address,
            purpose=purpose,
            expires_at=utcnow() + timedelta(minutes=15),
        )
    )
    db.commit()
    link = (
        settings.public_origin.rstrip("/")
        + "/#/?"
        + urlencode({"account_action": purpose, "token": token})
    )
    try:
        mail.send_account_link(address, link, purpose)
    except (OSError, ValueError):
        db.query(AccountToken).filter_by(digest=digest).delete()
        db.commit()
        raise HTTPException(503, "邮件暂时无法发送，请稍后重试") from None


@router.post("/recovery-email")
def recovery_email(body: BindEmail, request: Request, user: Member, db: DB):
    rate_limit(request, db)
    account_for(user, body.current_password, db)
    send_token(user.id, body.email, "verify_email", db)
    return {"ok": True, "message": "验证邮件已发送，15 分钟内有效"}


def consume(token, purpose, db):
    digest = hashlib.sha256(token.encode()).hexdigest()
    row = db.get(AccountToken, digest)
    if not row or row.purpose != purpose or row.expires_at <= utcnow():
        raise HTTPException(400, "链接无效或已过期，请重新申请")
    # Claim in the same transaction as the mutation; replay/concurrent use loses.
    result = db.execute(
        delete(AccountToken).where(
            AccountToken.digest == digest,
            AccountToken.purpose == purpose,
            AccountToken.expires_at > utcnow(),
        )
    )
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(400, "链接无效或已过期，请重新申请")
    return row


@router.post("/recovery-email/verify")
def verify_email(body: TokenBody, request: Request, db: DB):
    rate_limit(request, db)
    row = consume(body.token, "verify_email", db)
    if not db.query(Account).filter_by(user_id=row.user_id).first():
        raise HTTPException(400, "账号不可用")
    db.merge(RecoveryEmail(user_id=row.user_id, email=row.email))
    db.commit()
    return {"ok": True}


@router.post("/password/forgot")
def forgot_password(body: ForgotPassword, request: Request, db: DB):
    rate_limit(request, db)
    if not mail.ready():
        raise HTTPException(503, "邮件服务尚未配置")
    account = db.query(Account).filter_by(username=body.username.lower()).first()
    address = db.get(RecoveryEmail, account.user_id) if account else None
    if address and hmac.compare_digest(address.email.encode(), body.email.encode()):
        try:
            send_token(account.user_id, address.email, "reset_password", db)
        except HTTPException:
            # Same public response on unknown accounts and provider failures.
            pass
    return {
        "ok": True,
        "message": "如果账号与已验证邮箱匹配，重置链接将发送至该邮箱；15 分钟内有效。未收到可稍后重试。",
    }


@router.post("/password/reset")
def reset_password(body: ResetPassword, request: Request, response: Response, db: DB):
    rate_limit(request, db)
    row = consume(body.token, "reset_password", db)
    account = db.query(Account).filter_by(user_id=row.user_id).first()
    address = db.get(RecoveryEmail, row.user_id)
    if not account or not address or address.email != row.email:
        raise HTTPException(400, "链接无效或已过期，请重新申请")
    # Session/token invalidation and password replacement commit atomically.
    account.password_hash = password_hash(body.new_password)
    revoke(row.user_id, db)
    db.commit()
    clear_cookie(response)
    return {"ok": True}


@router.post("/account/delete")
def delete_account(
    body: DeleteAccount, request: Request, response: Response, user: Member, db: DB
):
    rate_limit(request, db)
    lock_account(user, db)
    account_for(user, body.current_password, db)
    if (
        db.query(MarketListing.id).filter_by(seller_id=user.id).first()
        or db.query(PaymentOrder.id).filter_by(user_id=user.id).first()
        or db.query(Purchase.id)
        .filter(or_(Purchase.buyer_id == user.id, Purchase.seller_id == user.id))
        .first()
    ):
        raise HTTPException(
            409, "账号存在作品或订单，暂不支持注销；请保留账号以处理作品和交易权益"
        )
    from app.models.profile import PublicProfile
    db.query(PublicProfile).filter_by(user_id=user.id).delete()
    from app.models.work_versions import WorkDraft, AssemblyLineage
    db.query(AssemblyLineage).filter(AssemblyLineage.plan_id.in_(db.query(AssembledPlan.id).filter_by(user_id=user.id))).delete(synchronize_session=False)
    db.query(WorkDraft).filter_by(user_id=user.id).delete()
    post_ids = [p.id for p in db.query(FeedPost.id).filter_by(user_id=user.id)]
    db.query(Notification).filter(
        or_(Notification.user_id == user.id, Notification.actor_id == user.id)
    ).delete(synchronize_session=False)
    feed_comment_ids = [
        c.id
        for c in db.query(FeedComment.id).filter(
            or_(FeedComment.user_id == user.id, FeedComment.post_id.in_(post_ids))
        )
    ]
    market_comment_ids = [
        c.id for c in db.query(MarketComment.id).filter_by(user_id=user.id)
    ]
    for kind, ids in [
        (
            "market_reply",
            [
                r.id
                for r in db.query(MarketReply.id).filter(
                    or_(
                        MarketReply.user_id == user.id,
                        MarketReply.comment_id.in_(market_comment_ids),
                    )
                )
            ],
        ),
        ("post", post_ids),
        ("feed_comment", feed_comment_ids),
        ("market_comment", market_comment_ids),
    ]:
        db.query(ReviewState).filter(
            ReviewState.kind == kind, ReviewState.target_id.in_(ids)
        ).delete(synchronize_session=False)
        db.query(ContentReport).filter(
            ContentReport.kind == kind, ContentReport.target_id.in_(ids)
        ).update({"status": "deleted"}, synchronize_session=False)
    for model, counter, relation, target in [
        (FeedLike, FeedPost, "post_id", FeedPost.id),
        (MarketLike, MarketListing, "listing_id", MarketListing.id),
    ]:
        for like in db.query(model).filter_by(user_id=user.id):
            db.query(counter).filter(
                target == getattr(like, relation), counter.likes_count > 0
            ).update({counter.likes_count: counter.likes_count - 1})
    db.query(FeedLike).filter(
        or_(FeedLike.user_id == user.id, FeedLike.post_id.in_(post_ids))
    ).delete(synchronize_session=False)
    db.query(FeedComment).filter(
        or_(FeedComment.user_id == user.id, FeedComment.post_id.in_(post_ids))
    ).delete(synchronize_session=False)
    db.query(Follow).filter(
        or_(Follow.follower_id == user.id, Follow.followee_id == user.id)
    ).delete(synchronize_session=False)
    db.query(MarketReply).filter(
        or_(
            MarketReply.user_id == user.id,
            MarketReply.comment_id.in_(market_comment_ids),
        )
    ).delete(synchronize_session=False)
    for model in [
        FeedPost,
        MarketLike,
        MarketComment,
        WeekStat,
        RankSnapshot,
        AssembledPlan,
        BadgeAward,
        TrainingPhoto,
        UserData,
        ExternalIdentity,
        RecoveryEmail,
    ]:
        db.query(model).filter_by(user_id=user.id).delete(synchronize_session=False)
    db.query(NodePreference).filter_by(user_id=user.id).delete(
        synchronize_session=False
    )
    db.query(DataMeta).filter_by(user_id=user.id).delete(synchronize_session=False)
    db.query(RankPrivacy).filter_by(user_id=user.id).delete(synchronize_session=False)
    db.query(WorkFavorite).filter_by(user_id=user.id).delete(synchronize_session=False)
    db.query(ContentReport).filter_by(reporter_id=user.id).delete(
        synchronize_session=False
    )
    db.query(ReminderSetting).filter_by(user_id=user.id).delete(
        synchronize_session=False
    )
    db.query(ReminderDelivery).filter_by(user_id=user.id).delete(
        synchronize_session=False
    )
    db.query(TrainingNode).filter_by(owner_id=user.id).delete(synchronize_session=False)
    revoke(user.id, db)
    db.query(Account).filter_by(user_id=user.id).delete(synchronize_session=False)
    # Reserve the numeric ID so old device caches cannot attach to a new user.
    # Retain no personal fields or usable login identity on this tombstone.
    user.openid = "deleted:" + secrets.token_hex(16)
    user.nickname = "已注销用户"
    user.avatar_url = ""
    user.body_kg = None
    user.level = "入门"
    user.created_at = utcnow()
    db.commit()
    clear_cookie(response)
    return {"ok": True}

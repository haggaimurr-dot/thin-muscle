import hashlib
import hmac
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.core.config import settings
from app.core.db import get_db
from app.models.account import Account, LoginSession, LoginAttempt
from app.models.entities import User

router = APIRouter(prefix="/auth", tags=["auth"])
COOKIE = "thin_muscle_session"


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt), 600_000
    ).hex()
    return salt + ":" + digest


def session_for(request, db):
    token = request.cookies.get(COOKIE, "")
    if not token:
        raise HTTPException(401, "请先登录")
    session = db.get(LoginSession, hashlib.sha256(token.encode()).hexdigest())
    if not session or session.expires_at <= datetime.utcnow():
        raise HTTPException(401, "登录已过期，请重新登录")
    if request.method not in ("GET", "HEAD", "OPTIONS") and not hmac.compare_digest(
        request.headers.get("X-CSRF-Token", ""), session.csrf
    ):
        raise HTTPException(403, "请求校验失败，请刷新后重试")
    return session


def current_user(request: Request, db: Session = Depends(get_db)):
    session = session_for(request, db)
    user = db.get(User, session.user_id)
    if user is None or user.openid.startswith("deleted:"):
        raise HTTPException(401, "账号不存在")
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        from app.services.account_lock import lock_account

        lock_account(user, db)
    return user


def issue(user, response, db):
    token = secrets.token_urlsafe(32)
    csrf = secrets.token_urlsafe(32)
    db.add(
        LoginSession(
            token_hash=hashlib.sha256(token.encode()).hexdigest(),
            user_id=user.id,
            csrf=csrf,
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
    )
    db.query(LoginSession).filter(LoginSession.expires_at < datetime.utcnow()).delete()
    db.commit()
    response.set_cookie(
        COOKIE,
        token,
        max_age=7 * 86400,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    response.headers["Cache-Control"] = "no-store"
    return {"user": {"id": user.id, "nickname": user.nickname}, "csrf": csrf}


def rate_limit(request, db):
    # Persisted limits survive restarts and are shared by workers. Do not trust client forwarding headers.
    key = hashlib.sha256(
        (request.client.host if request.client else "unknown").encode()
    ).hexdigest()
    now = datetime.utcnow()
    row = db.get(LoginAttempt, key)
    if not row:
        row = LoginAttempt(key=key, count=0, window_start=now)
        db.add(row)
    if row.window_start < now - timedelta(minutes=15):
        row.count = 0
        row.window_start = now
    row.count += 1
    db.commit()
    if row.count > 30:
        raise HTTPException(429, "尝试过于频繁，请 15 分钟后重试")


class Credentials(BaseModel):
    username: str = Field(min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(min_length=10, max_length=128)


@router.post("/register")
def register(
    body: Credentials,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    rate_limit(request, db)
    username = body.username.lower()
    if db.query(Account).filter_by(username=username).first():
        raise HTTPException(409, "用户名不可用")
    user = User(openid="account:" + secrets.token_hex(16), nickname=body.username)
    db.add(user)
    try:
        db.flush()
        db.add(
            Account(
                user_id=user.id,
                username=username,
                password_hash=password_hash(body.password),
            )
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "用户名不可用")
    return issue(user, response, db)


@router.post("/login")
def login(
    body: Credentials,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    rate_limit(request, db)
    account = db.query(Account).filter_by(username=body.username.lower()).first()
    # Always perform password derivation to limit account-enumeration timing differences.
    stored = account.password_hash if account else "0" * 32 + ":" + "0" * 64
    if not hmac.compare_digest(
        password_hash(body.password, stored.split(":")[0]), stored
    ):
        raise HTTPException(401, "用户名或密码不正确")
    return issue(db.get(User, account.user_id), response, db)


@router.get("/me")
def me(request: Request, response: Response, db: Session = Depends(get_db)):
    session = session_for(request, db)
    user = db.get(User, session.user_id)
    if user is None or user.openid.startswith("deleted:"):
        raise HTTPException(401, "账号不可用")
    response.headers["Cache-Control"] = "no-store"
    return {"user": {"id": user.id, "nickname": user.nickname}, "csrf": session.csrf}


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    session = session_for(request, db)
    db.delete(session)
    db.commit()
    response.delete_cookie(
        COOKIE, path="/", secure=settings.cookie_secure, samesite="lax"
    )
    return {"ok": True}


@router.get("/capabilities")
def capabilities():
    from app.api.identity import sms_ready, wechat_ready
    from app.api.payments import ready

    return {
        "password": True,
        "sms": sms_ready(),
        "wechat": wechat_ready("web") or wechat_ready("browser"),
        "wechat_web": wechat_ready("web"),
        "wechat_browser": wechat_ready("browser"),
        "payments": settings.stripe_payment_methods if ready() else [],
        "food_recognition": bool(
            settings.ai_food_enabled
            and settings.ai_gateway_api_key
            and settings.ai_vision_model
        ),
        "demo_mode": settings.allow_demo_auth,
    }

import hashlib
import hmac
import secrets
import ssl
from datetime import datetime, timedelta
from urllib.parse import urlencode
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import delete
from app.api.auth import (
    issue,
    rate_limit,
    current_user,
    session_for,
    Credentials,
    password_hash,
)
from app.core.config import settings
from app.core.db import get_db
from app.models.account import (
    ExternalIdentity,
    OAuthState,
    LoginAttempt,
    Account,
    AccountToken,
    RecoveryEmail,
)
from app.models.entities import User
from app.services.account_lock import lock_account

router = APIRouter(prefix="/auth", tags=["auth"])


def sms_ready():
    return bool(
        settings.twilio_account_sid
        and settings.twilio_auth_token
        and settings.twilio_verify_service_sid
    )


def wechat_ready(kind):
    appid, secret = (
        (settings.wx_web_app_id, settings.wx_web_app_secret)
        if kind == "web"
        else (settings.wx_app_id, settings.wx_app_secret)
    )
    return bool(appid and secret and settings.public_origin.startswith("https://"))


def identity_user(subject, nickname, db):
    identity = db.get(ExternalIdentity, subject)
    if identity:
        return db.get(User, identity.user_id)
    user = User(openid="identity:" + secrets.token_hex(16), nickname=nickname)
    db.add(user)
    try:
        db.flush()
        db.add(ExternalIdentity(subject=subject, user_id=user.id))
        db.commit()
    except IntegrityError:
        db.rollback()
        identity = db.get(ExternalIdentity, subject)
        if not identity:
            raise HTTPException(409, "账号创建冲突，请重试")
        return db.get(User, identity.user_id)
    return user


class Phone(BaseModel):
    phone: str = Field(pattern=r"^\+[1-9][0-9]{7,14}$")


class VerifyPhone(Phone):
    code: str = Field(pattern=r"^[0-9]{4,10}$")


async def verify_request(endpoint, data):
    if not sms_ready():
        raise HTTPException(503, "短信登录尚未配置")
    try:
        async with httpx.AsyncClient(
            timeout=15, verify=ssl.create_default_context(), follow_redirects=False
        ) as client:
            result = await client.post(
                f"https://verify.twilio.com/v2/Services/{settings.twilio_verify_service_sid}/{endpoint}",
                auth=(settings.twilio_account_sid, settings.twilio_auth_token),
                data=data,
            )
            result.raise_for_status()
            return result.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, "短信服务暂时不可用，请稍后重试")


@router.post("/sms/send")
async def send(body: Phone, request: Request, db: Session = Depends(get_db)):
    rate_limit(request, db)
    key = (
        "sms:"
        + hashlib.sha256(
            (body.phone + str(datetime.utcnow().date())).encode()
        ).hexdigest()
    )
    attempts = db.get(LoginAttempt, key)
    if attempts and attempts.count >= 3:
        raise HTTPException(429, "此手机号今日发送次数已达上限")
    if not attempts:
        attempts = LoginAttempt(key=key, count=0)
        db.add(attempts)
    attempts.count += 1
    db.commit()
    await verify_request("Verifications", {"To": body.phone, "Channel": "sms"})
    return {"ok": True, "message": "验证码已发送"}


@router.post("/sms/login")
async def login_phone(
    body: VerifyPhone,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    rate_limit(request, db)
    result = await verify_request(
        "VerificationCheck", {"To": body.phone, "Code": body.code}
    )
    if result.get("status") != "approved":
        raise HTTPException(401, "验证码无效或已过期")
    user = identity_user("phone:" + body.phone, "手机用户" + body.phone[-4:], db)
    return issue(user, response, db)


@router.get("/wechat/start")
def start(response: Response, kind: str = "web", db: Session = Depends(get_db)):
    return begin_wechat(response, kind, db)


def begin_wechat(response, kind, db, user_id=None):
    if kind not in ("web", "browser") or not wechat_ready(kind):
        raise HTTPException(503, "微信登录尚未配置")
    value = secrets.token_urlsafe(32)
    db.query(OAuthState).filter(OAuthState.expires_at < datetime.utcnow()).delete()
    db.add(
        OAuthState(
            digest=hashlib.sha256(value.encode()).hexdigest(),
            kind=("bind_" + kind) if user_id is not None else kind,
            expires_at=datetime.utcnow() + timedelta(minutes=5),
        )
    )
    if user_id is not None:
        db.add(
            AccountToken(
                digest=hashlib.sha256(value.encode()).hexdigest(),
                user_id=user_id,
                purpose="bind_wechat",
                email="",
                expires_at=datetime.utcnow() + timedelta(minutes=5),
            )
        )
    db.commit()
    appid = settings.wx_web_app_id if kind == "web" else settings.wx_app_id
    params = urlencode(
        {
            "appid": appid,
            "redirect_uri": settings.public_origin + "/api/v1/auth/wechat/callback",
            "response_type": "code",
            "scope": "snsapi_login" if kind == "web" else "snsapi_userinfo",
            "state": value,
        }
    )
    url = (
        "https://open.weixin.qq.com/connect/"
        + ("qrconnect" if kind == "web" else "oauth2/authorize")
        + "?"
        + params
        + "#wechat_redirect"
    )
    response.set_cookie(
        "thin_muscle_oauth_state",
        value,
        max_age=300,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/api/v1/auth/wechat/",
    )
    return {"url": url}


@router.get("/wechat/callback")
async def callback(
    request: Request, code: str, state: str, db: Session = Depends(get_db)
):
    if not hmac.compare_digest(
        request.cookies.get("thin_muscle_oauth_state", ""), state
    ):
        raise HTTPException(400, "微信登录会话不匹配，请重新开始")
    digest = hashlib.sha256(state.encode()).hexdigest()
    row = db.get(OAuthState, digest)
    if not row or row.expires_at < datetime.utcnow():
        raise HTTPException(400, "微信登录请求已过期，请重新开始")
    binding = row.kind.startswith("bind_")
    kind = row.kind.removeprefix("bind_")
    binding_user = None
    if binding:
        intent = db.get(AccountToken, digest)
        if (
            not intent
            or intent.purpose != "bind_wechat"
            or intent.expires_at <= datetime.utcnow()
        ):
            raise HTTPException(400, "绑定请求已过期，请重新开始")
        session = session_for(request, db)
        if session.user_id != intent.user_id:
            raise HTTPException(403, "请使用发起绑定的账号完成授权")
        binding_user = intent.user_id
    consumed = db.execute(delete(OAuthState).where(OAuthState.digest == digest))
    db.commit()
    if consumed.rowcount != 1 or not wechat_ready(kind):
        raise HTTPException(400, "微信登录请求无效")
    appid, secret = (
        (settings.wx_web_app_id, settings.wx_web_app_secret)
        if kind == "web"
        else (settings.wx_app_id, settings.wx_app_secret)
    )
    try:
        async with httpx.AsyncClient(
            timeout=15, verify=ssl.create_default_context(), follow_redirects=False
        ) as client:
            result = await client.get(
                "https://api.weixin.qq.com/sns/oauth2/access_token",
                params={
                    "appid": appid,
                    "secret": secret,
                    "code": code,
                    "grant_type": "authorization_code",
                },
            )
            result.raise_for_status()
            data = result.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, "微信服务暂时不可用")
    if not data.get("openid") or data.get("errcode"):
        raise HTTPException(401, "微信授权失败，请重试")
    subject = (
        "wx-union:" + data["unionid"]
        if data.get("unionid")
        else "wx:" + appid + ":" + data["openid"]
    )
    if binding:
        user = db.get(User, binding_user)
        lock_account(user, db)
        bind_identity(subject, user, db)
        db.query(AccountToken).filter_by(digest=digest).delete()
        db.commit()
        response = RedirectResponse(
            settings.public_origin + "/#/?identity_bound=1", status_code=303
        )
        response.delete_cookie(
            "thin_muscle_oauth_state",
            path="/api/v1/auth/wechat/",
            secure=settings.cookie_secure,
            samesite="lax",
        )
        return response
    user = identity_user(subject, "微信用户", db)
    response = RedirectResponse(settings.public_origin + "/#/", status_code=303)
    response.delete_cookie(
        "thin_muscle_oauth_state",
        path="/api/v1/auth/wechat/",
        secure=settings.cookie_secure,
        samesite="lax",
    )
    issue(user, response, db)
    return response


def identity_key(subject):
    return hashlib.sha256(subject.encode()).hexdigest()


def identity_available(subject):
    if subject.startswith("phone:"):
        return sms_ready()
    if subject.startswith("wx-union:"):
        return wechat_ready("web") or wechat_ready("browser")
    if subject.startswith("wx:"):
        app_id = subject.split(":", 2)[1]
        return (wechat_ready("web") and app_id == settings.wx_web_app_id) or (
            wechat_ready("browser") and app_id == settings.wx_app_id
        )
    return False


def bind_identity(subject, user, db):
    existing = db.get(ExternalIdentity, subject)
    if existing and existing.user_id != user.id:
        raise HTTPException(409, "该登录身份已属于其他账号，不能自动合并")
    if not existing:
        db.add(ExternalIdentity(subject=subject, user_id=user.id))
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            raise HTTPException(409, "该登录身份已被绑定，请刷新后重试") from None


@router.get("/identities")
def identities(user: User = Depends(current_user), db: Session = Depends(get_db)):
    items = []
    account = db.query(Account).filter_by(user_id=user.id).first()
    if account:
        items.append(
            {
                "key": "password",
                "kind": "password",
                "label": "用户名：" + account.username,
            }
        )
    for row in db.query(ExternalIdentity).filter_by(user_id=user.id):
        phone = row.subject.removeprefix("phone:")
        is_phone = row.subject.startswith("phone:")
        items.append(
            {
                "key": identity_key(row.subject),
                "kind": "phone" if is_phone else "wechat",
                "label": (phone[:3] + "****" + phone[-4:]) if is_phone else "微信身份",
            }
        )
    return {
        "items": items,
        "sms_available": sms_ready(),
        "wechat_web": wechat_ready("web"),
        "wechat_browser": wechat_ready("browser"),
    }


@router.post("/identities/password")
def bind_password(
    body: Credentials,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    rate_limit(request, db)
    lock_account(user, db)
    if db.query(Account).filter_by(user_id=user.id).first():
        raise HTTPException(409, "已经绑定密码登录，请使用修改密码功能")
    db.add(
        Account(
            user_id=user.id,
            username=body.username.lower(),
            password_hash=password_hash(body.password),
        )
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "用户名不可用") from None
    return {"ok": True}


@router.post("/identities/sms")
async def bind_phone(
    body: VerifyPhone,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    rate_limit(request, db)
    result = await verify_request(
        "VerificationCheck", {"To": body.phone, "Code": body.code}
    )
    if result.get("status") != "approved":
        raise HTTPException(400, "验证码无效或已过期")
    lock_account(user, db)
    bind_identity("phone:" + body.phone, user, db)
    db.commit()
    return {"ok": True}


class WechatKind(BaseModel):
    kind: str = Field(pattern=r"^(web|browser)$")


@router.post("/identities/wechat/start")
def bind_wechat(
    body: WechatKind,
    request: Request,
    response: Response,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    rate_limit(request, db)
    return begin_wechat(response, body.kind, db, user.id)


class UnlinkIdentity(BaseModel):
    key: str = Field(min_length=1, max_length=64)


@router.post("/identities/unlink")
def unlink(
    body: UnlinkIdentity,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    rate_limit(request, db)
    lock_account(user, db)
    account = db.query(Account).filter_by(user_id=user.id).first()
    rows = db.query(ExternalIdentity).filter_by(user_id=user.id).all()
    target = (
        account
        if body.key == "password"
        else next((r for r in rows if identity_key(r.subject) == body.key), None)
    )
    if not target:
        raise HTTPException(404, "未找到当前账号的登录身份")
    if len(rows) + bool(account) <= 1:
        raise HTTPException(409, "必须保留至少一种登录方式")
    remaining_password = account is not None and target is not account
    remaining_external = [row for row in rows if row is not target]
    available = remaining_password or any(
        identity_available(row.subject) for row in remaining_external
    )
    if not available:
        raise HTTPException(409, "剩余登录方式的渠道尚未配置，请先保留密码登录")
    db.delete(target)
    # Outstanding sessions issued via a removed method cannot remain usable.
    from app.models.account import LoginSession
    from app.api.auth import COOKIE

    token_hash = hashlib.sha256(request.cookies.get(COOKIE, "").encode()).hexdigest()
    db.query(LoginSession).filter(
        LoginSession.user_id == user.id, LoginSession.token_hash != token_hash
    ).delete()
    db.query(AccountToken).filter_by(user_id=user.id).delete()
    if body.key == "password":
        db.query(RecoveryEmail).filter_by(user_id=user.id).delete()
    db.commit()
    return {"ok": True}

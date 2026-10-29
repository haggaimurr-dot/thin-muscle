from urllib.parse import urlsplit
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.entities import User
from app.models.profile import PublicProfile
from app.services.account_lock import lock_account

router = APIRouter(prefix="/home/profile", tags=["profile"])


class ProfileBody(BaseModel):
    nickname: str = Field(min_length=1, max_length=64)
    avatar_url: str = Field(default="", max_length=512)
    bio: str = Field(default="", max_length=300)
    show_avatar: bool = False
    show_bio: bool = False

    @field_validator("nickname", "bio")
    @classmethod
    def text(cls, value, info):
        value = value.strip()
        if (info.field_name == "nickname" and not value) or any(
            ord(c) < 32 for c in value
        ):
            raise ValueError("昵称/简介不能空白或包含控制字符")
        return value

    @field_validator("avatar_url")
    @classmethod
    def avatar(cls, value):
        if value:
            u = urlsplit(value)
            if u.scheme != "https" or not u.hostname or u.username or u.password:
                raise ValueError("头像须为有效HTTPS图片地址")
        return value


@router.get("")
def read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pref = db.get(PublicProfile, user.id)
    return {
        "nickname": user.nickname,
        "avatar_url": user.avatar_url,
        "bio": pref.bio if pref else "",
        "show_avatar": pref.show_avatar if pref else False,
        "show_bio": pref.show_bio if pref else False,
    }


@router.put("")
def save(
    body: ProfileBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lock_account(user, db)
    user.nickname, user.avatar_url = body.nickname, body.avatar_url
    db.merge(
        PublicProfile(
            user_id=user.id,
            bio=body.bio,
            show_avatar=body.show_avatar,
            show_bio=body.show_bio,
        )
    )
    db.commit()
    return {"ok": True}

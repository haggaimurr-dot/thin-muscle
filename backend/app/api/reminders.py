import json
from typing import Annotated
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator, StrictInt
from sqlalchemy.orm import Session
from app.api.auth import current_user
from app.core.db import get_db
from app.models.entities import User
from app.models.account import ReminderSetting, ReminderDelivery, RecoveryEmail
from app.services import mail

router = APIRouter(prefix="/reminders", tags=["reminders"])
DB = Annotated[Session, Depends(get_db)]
Member = Annotated[User, Depends(current_user)]


class ReminderConfig(BaseModel):
    enabled: bool = False
    timezone: str = "Asia/Shanghai"
    training_time: str = Field(
        default="07:00", pattern=r"^(?:[01][0-9]|2[0-3]):[0-5][0-9]$"
    )
    recovery_time: str = Field(
        default="21:00", pattern=r"^(?:[01][0-9]|2[0-3]):[0-5][0-9]$"
    )
    training_days: list[StrictInt] = Field(default=[1, 3, 5], max_length=7)
    recovery_days: list[StrictInt] = Field(default=[2, 4, 6, 7], max_length=7)

    @field_validator("timezone")
    @classmethod
    def timezone_valid(cls, value):
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("无效时区") from None
        return value

    @field_validator("training_days", "recovery_days")
    @classmethod
    def days_valid(cls, value):
        if len(value) != len(set(value)) or any(
            type(v) is not int or not 1 <= v <= 7 for v in value
        ):
            raise ValueError("星期须为1–7且不重复")
        return value


@router.get("")
def read(user: Member, db: DB):
    row = db.get(ReminderSetting, user.id)
    return {
        "settings": json.loads(row.payload) if row else ReminderConfig().model_dump(),
        "available": mail.ready() and db.get(RecoveryEmail, user.id) is not None,
        "deliveries": [
            {"day": r.day, "kind": r.kind, "status": r.status}
            for r in db.query(ReminderDelivery)
            .filter_by(user_id=user.id)
            .order_by(ReminderDelivery.day.desc())
            .limit(20)
        ],
    }


@router.put("")
def save(body: ReminderConfig, user: Member, db: DB):
    if body.enabled and (not mail.ready() or not db.get(RecoveryEmail, user.id)):
        raise HTTPException(503, "启用邮件提醒需要配置邮件服务并验证恢复邮箱")
    db.merge(ReminderSetting(user_id=user.id, payload=body.model_dump_json()))
    db.commit()
    return {"ok": True}

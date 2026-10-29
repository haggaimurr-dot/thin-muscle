from typing import Annotated, Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.entities import User
from app.models.moderation import ContentReport, ReviewLog, ReviewState
from app.services.moderation import target_info, is_admin

router = APIRouter(prefix="/moderation", tags=["moderation"])
DB = Annotated[Session, Depends(get_db)]
Member = Annotated[User, Depends(get_current_user)]
Kind = Literal["market", "market_comment", "post", "feed_comment", "market_reply"]


class ReportIn(BaseModel):
    kind: Kind
    target_id: int = Field(gt=0)
    reason: str = Field(min_length=1, max_length=500)

    @field_validator("reason")
    @classmethod
    def not_blank(cls, v):
        if not v.strip():
            raise ValueError("请填写举报原因")
        return v.strip()


class ReviewIn(BaseModel):
    hidden: bool


@router.get("/capabilities")
def capabilities(user: Member):
    return {"admin": is_admin(user)}


@router.post("/reports")
def report(body: ReportIn, user: Member, db: DB):
    target_info(db, body.kind, body.target_id)
    row = (
        db.query(ContentReport)
        .filter_by(reporter_id=user.id, kind=body.kind, target_id=body.target_id)
        .first()
    )
    if not row:
        row = ContentReport(
            reporter_id=user.id,
            kind=body.kind,
            target_id=body.target_id,
            reason=body.reason,
        )
        db.add(row)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            row = (
                db.query(ContentReport)
                .filter_by(
                    reporter_id=user.id, kind=body.kind, target_id=body.target_id
                )
                .one()
            )
    return {"id": row.id, "status": row.status}


@router.get("/reports")
def reports(user: Member, db: DB):
    if not is_admin(user):
        raise HTTPException(403, "仅审核管理员可查看举报队列")
    items = []
    for r in db.query(ContentReport).order_by(ContentReport.id.desc()).limit(100):
        try:
            if r.status == "deleted":
                raise HTTPException(404, "已删除")
            _, _, text = target_info(db, r.kind, r.target_id)
        except HTTPException:
            text = "[内容已删除]"
        items.append(
            {
                "id": r.id,
                "kind": r.kind,
                "target_id": r.target_id,
                "reason": r.reason,
                "status": r.status,
                "text": text[:200],
            }
        )
    return {"items": items}


@router.post("/{kind}/{target_id}/review")
def review(kind: Kind, target_id: int, body: ReviewIn, user: Member, db: DB):
    _, owner, _ = target_info(db, kind, target_id)
    if not is_admin(user) and not (
        kind in ["market_comment", "feed_comment", "post", "market_reply"] and owner == user.id
    ):
        raise HTTPException(403, "没有该内容的管理权限")
    db.merge(ReviewState(kind=kind, target_id=target_id, hidden=body.hidden))
    db.add(
        ReviewLog(actor_id=user.id, kind=kind, target_id=target_id, hidden=body.hidden)
    )
    db.query(ContentReport).filter_by(kind=kind, target_id=target_id).update(
        {"status": "reviewed"}
    )
    db.commit()
    return {"ok": True, "hidden": body.hidden}

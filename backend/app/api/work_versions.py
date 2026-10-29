import json
from datetime import datetime
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.entities import MarketListing, User, AssembledPlan
from app.models.work_versions import WorkDraft, WorkVersion, AssemblyLineage
from app.schemas.market import ListingCreate
from app.services import market as svc
from app.services.account_lock import lock_account

router = APIRouter(prefix="/market", tags=["work-versions"])


@router.get("/assemblies")
def assemblies(
    before: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(AssembledPlan).filter_by(user_id=user.id)
    if before is not None:
        query = query.filter(AssembledPlan.id < before)
    rows = query.order_by(AssembledPlan.id.desc()).limit(21).all()
    items = []
    for row in rows[:20]:
        lineage = db.get(AssemblyLineage, row.id)
        items.append(
            {
                "plan_id": row.id,
                "title": row.title,
                "cycle": row.cycle,
                "days": json.loads(row.days_json),
                "active": row.active,
                "created_at": row.created_at,
                "previous_id": lineage.previous_id if lineage else None,
                "restored_from_id": lineage.restored_from_id if lineage else None,
            }
        )
    return {"items": items, "next_cursor": rows[19].id if len(rows) > 20 else None}


class DraftBody(BaseModel):
    data: dict


def owned(listing_id, user, db):
    lock_account(user, db)
    row = db.get(MarketListing, listing_id)
    if not row or row.seller_id != user.id:
        raise HTTPException(404, "作品不存在")
    return row


@router.get("/drafts")
def drafts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {
        "items": [
            {
                "draft_id": r.draft_id,
                "data": json.loads(r.payload),
                "updated_at": r.updated_at,
            }
            for r in db.query(WorkDraft)
            .filter_by(user_id=user.id)
            .order_by(WorkDraft.updated_at.desc())
        ]
    }


@router.put("/drafts/{draft_id}")
def save_draft(
    draft_id: str,
    body: DraftBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lock_account(user, db)
    if not 1 <= len(draft_id) <= 64:
        raise HTTPException(422, "草稿标识无效")
    try:
        text = json.dumps(body.data, ensure_ascii=False, allow_nan=False)
    except (ValueError, TypeError):
        raise HTTPException(422, "草稿包含无效数值")
    if len(text.encode()) > 256 * 1024:
        raise HTTPException(413, "草稿超过256KB")
    row = db.get(WorkDraft, (user.id, draft_id))
    if row is None:
        if db.query(WorkDraft).filter_by(user_id=user.id).count() >= 100:
            raise HTTPException(409, "最多保存100份草稿")
        row = WorkDraft(user_id=user.id, draft_id=draft_id)
        db.add(row)
    row.payload, row.updated_at = text, datetime.utcnow()
    db.commit()
    return {"ok": True}


@router.delete("/drafts/{draft_id}")
def remove_draft(
    draft_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    db.query(WorkDraft).filter_by(user_id=user.id, draft_id=draft_id).delete()
    db.commit()
    return {"ok": True}


class EditBody(BaseModel):
    expected_version: int = Field(ge=1)
    content: ListingCreate


@router.put("/listings/{listing_id}/content")
def edit(
    listing_id: int,
    body: EditBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = owned(listing_id, user, db)
    current = svc.current_work_version(db, listing_id)
    if current != body.expected_version:
        raise HTTPException(409, "作品已在其他窗口更新，请重新打开作品")
    if body.content.kind != row.kind:
        raise HTTPException(422, "已发布作品不可更改类型")
    # First edit of a legacy work freezes the original as version 1.
    if not db.get(WorkVersion, (listing_id, current)):
        svc.capture_work_version(db, row, current)
    fresh = svc.build_listing(user, body.content)
    for field in svc.CONTENT_FIELDS:
        setattr(row, field, getattr(fresh, field))
    svc.capture_work_version(db, row, current + 1)
    db.commit()
    return {"version": current + 1, "status": row.status}


class StatusBody(BaseModel):
    status: Literal["listed", "unlisted"]


@router.post("/listings/{listing_id}/status")
def status(
    listing_id: int,
    body: StatusBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = owned(listing_id, user, db)
    row.status = body.status
    db.commit()
    return {"status": row.status}


@router.get("/listings/{listing_id}/versions")
def versions(
    listing_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = owned(listing_id, user, db)
    items = [
        {
            "version": r.version,
            "created_at": r.created_at,
            "content": json.loads(r.payload),
        }
        for r in db.query(WorkVersion)
        .filter_by(listing_id=listing_id)
        .order_by(WorkVersion.version.desc())
    ]
    if not items:
        items = [
            {
                "version": 1,
                "created_at": row.created_at,
                "content": svc.listing_payload(row),
            }
        ]
    return {"items": items}

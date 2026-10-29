from typing import Annotated
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.entities import User
from app.models.account import RankPrivacy
from app.models.home import RankSnapshot

router = APIRouter(prefix="/home", tags=["ranking privacy"])
DB = Annotated[Session, Depends(get_db)]
Member = Annotated[User, Depends(get_current_user)]


class PrivacyIn(BaseModel):
    participate: bool = True
    show_weight: bool = True


@router.get("/rank-privacy")
def get_privacy(user: Member, db: DB):
    row = db.get(RankPrivacy, user.id)
    return {
        "participate": row.participate if row else True,
        "show_weight": row.show_weight if row else True,
    }


@router.put("/rank-privacy")
def save_privacy(body: PrivacyIn, user: Member, db: DB):
    db.merge(RankPrivacy(user_id=user.id, **body.model_dump()))
    db.commit()
    return {"ok": True}


@router.get("/rank-trend")
def trend(
    user: Member,
    db: DB,
    dim: str = Query(
        default="strength", pattern="^(strength|overload|protein|streak|weight_class)$"
    ),
    period: str = Query(default="week", pattern="^(week|month)$"),
    limit: int = Query(default=30, ge=1, le=366),
):
    rows = (
        db.query(RankSnapshot)
        .filter_by(user_id=user.id, dim=dim, period=period)
        .order_by(RankSnapshot.hour_bucket.desc())
        .limit(limit * 24 + 24)
        .all()
    )
    dates = {}
    for row in rows:
        day = row.hour_bucket[:10]
        if day not in dates and len(dates) < limit:
            dates[day] = {
                "date": day,
                "rank": row.rank,
                "score": row.score,
                "hour": row.hour_bucket,
            }
    return {
        "rule": "每个UTC日期取最后一份已有排名快照，仅本人可见；退出后停止进入新快照，历史不回填。",
        "items": sorted(dates.values(), key=lambda v: v["date"]),
    }

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.entities import User, MarketListing
from app.models.account import WorkFavorite
from app.services.market import listing_payload
from app.services.moderation import hidden_clause

router = APIRouter(prefix="/market", tags=["market collections"])
DB = Annotated[Session, Depends(get_db)]
Member = Annotated[User, Depends(get_current_user)]


class FavoriteIn(BaseModel):
    favorite: bool


@router.get("/favorites")
def favorites(user: Member, db: DB):
    rows = (
        db.query(MarketListing, User)
        .join(WorkFavorite, WorkFavorite.listing_id == MarketListing.id)
        .join(User, User.id == MarketListing.seller_id)
        .filter(WorkFavorite.user_id == user.id, MarketListing.status == "listed")
        .filter(~hidden_clause(db, "market", MarketListing.id))
        .order_by(MarketListing.id.desc())
        .all()
    )
    return {"items": [{**listing_payload(l), "user": u.nickname} for l, u in rows]}


@router.post("/listings/{listing_id}/favorite")
def favorite(listing_id: int, body: FavoriteIn, user: Member, db: DB):
    listing = db.get(MarketListing, listing_id)
    if not listing or listing.status != "listed":
        raise HTTPException(404, "作品不存在")
    if body.favorite:
        db.merge(WorkFavorite(user_id=user.id, listing_id=listing_id))
    else:
        db.query(WorkFavorite).filter_by(
            user_id=user.id, listing_id=listing_id
        ).delete()
    db.commit()
    return {"favorite": body.favorite}


@router.get("/creators/{creator_id}")
def creator(creator_id: int, db: DB):
    user = db.get(User, creator_id)
    if not user or user.openid.startswith("deleted:"):
        raise HTTPException(404, "创作者不存在")
    works = (
        db.query(MarketListing)
        .filter_by(seller_id=creator_id, status="listed")
        .filter(~hidden_clause(db, "market", MarketListing.id))
        .order_by(MarketListing.id.desc())
        .all()
    )
    return {"name": user.nickname, "items": [listing_payload(l) for l in works]}


@router.get("/recommendations")
def recommendations(user: Member, db: DB):
    rows = (
        db.query(MarketListing, User)
        .join(User, User.id == MarketListing.seller_id)
        .filter(MarketListing.status == "listed", MarketListing.level == user.level)
        .filter(~hidden_clause(db, "market", MarketListing.id))
        .order_by(MarketListing.likes_count.desc(), MarketListing.id.desc())
        .limit(20)
        .all()
    )
    return {
        "rule": "按账号训练等级匹配，按点赞数降序、作品编号降序；最多20项。",
        "items": [{**listing_payload(l), "user": u.nickname} for l, u in rows],
    }

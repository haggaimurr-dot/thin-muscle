import json
import base64
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel, Field
from app.models.account import NodePreference
from app.models.account import WorkFavorite
from app.models.entities import TrainingNode

from app.api.deps import get_current_user
from app.core.db import get_db
from app.core.config import settings
from app.models.entities import MarketComment, MarketLike, MarketListing, Purchase, User
from app.schemas.market import (
    AssembleRequest,
    CommentCreate,
    ListingCreate,
    ReplicateRequest,
)
from app.services import market as svc
from app.services.moderation import is_admin
from app.models.moderation import ReviewState
from app.models.moderation import MarketReply

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/node-library")
def node_library(
    q: str = Query(default="", max_length=128),
    category: str = Query(default="", max_length=32),
    kind: str = Query(default="all", pattern="^(all|plan|lesson)$"),
    favorite_only: bool = False,
    before: int | None = Query(default=None, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = (
        db.query(TrainingNode, NodePreference)
        .outerjoin(
            NodePreference,
            and_(
                NodePreference.node_id == TrainingNode.id,
                NodePreference.user_id == user.id,
            ),
        )
        .filter(TrainingNode.owner_id == user.id)
    )
    if q.strip():
        query = query.filter(TrainingNode.title.contains(q.strip(), autoescape=True))
    if category:
        query = query.filter(NodePreference.category == category)
    if favorite_only:
        query = query.filter(NodePreference.favorite.is_(True))
    if kind != "all":
        query = query.filter(TrainingNode.kind == kind)
    if before:
        query = query.filter(TrainingNode.id < before)
    rows = query.order_by(TrainingNode.id.desc()).limit(limit + 1).all()
    return {
        "items": [
            {
                **svc.node_out(n),
                "category": p.category if p else "",
                "favorite": p.favorite if p else False,
            }
            for n, p in rows[:limit]
        ],
        "next_cursor": rows[limit - 1][0].id if len(rows) > limit else None,
    }


@router.get("/mine")
def my_listings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return {
        "items": [
            {
                **svc.listing_payload(row),
                "status": row.status,
                "version": svc.current_work_version(db, row.id),
            }
            for row in db.query(MarketListing)
            .filter_by(seller_id=user.id)
            .order_by(MarketListing.id.desc())
        ]
    }


@router.get("/listings")
def get_listings(
    kind: str | None = Query(default="all", description="all|plan|lesson"),
    cycle: str | None = Query(default="all", description="all|week|month|full"),
    level: str | None = Query(default="all", description="all|入门|进阶"),
    q: str = Query(default="", max_length=128),
    sort: str = Query(
        default="newest", pattern="^(newest|price_asc|price_desc|popular)$"
    ),
    cursor: str | None = Query(default=None, max_length=4096),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    parsed = None
    if cursor:
        try:
            decoded = json.loads(base64.urlsafe_b64decode(cursor))
            if (
                decoded[0] != [kind, cycle, level, q, sort]
                or type(decoded[2]) is not int
            ):
                raise ValueError()
            value = (
                datetime.fromisoformat(decoded[1]) if sort == "newest" else decoded[1]
            )
            if sort != "newest" and type(value) is not int:
                raise ValueError()
            parsed = (value, decoded[2])
        except (ValueError, TypeError, IndexError, KeyError):
            raise HTTPException(422, "分页游标无效或筛选条件已改变")
    rows = svc.list_listings(
        db,
        kind=kind,
        cycle=cycle,
        level=level,
        query=q,
        sort=sort,
        cursor=parsed,
        limit=limit,
    )
    next_cursor = None
    if len(rows) > limit:
        last = rows[limit - 1][0]
        value = {
            "newest": last.created_at.isoformat(),
            "price_asc": last.price_fen,
            "price_desc": last.price_fen,
            "popular": last.likes_count,
        }[sort]
        next_cursor = base64.urlsafe_b64encode(
            json.dumps([[kind, cycle, level, q, sort], value, last.id]).encode()
        ).decode()
    items = []
    for listing, seller in rows[:limit]:
        card = svc.listing_payload(listing)
        card["user"] = seller.nickname or "训练伙伴"
        items.append(card)
    if not items and (
        kind not in (None, "all")
        or cycle not in (None, "all")
        or level not in (None, "all")
    ):
        return {"items": [], "empty_hint": "该筛选下暂无方案"}
    return {"items": items, "next_cursor": next_cursor}


@router.get("/listings/{listing_id}")
def get_listing_detail(
    listing_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listing, seller = svc.get_listing(db, listing_id)
    bought = (
        db.query(Purchase)
        .filter_by(buyer_id=user.id, listing_id=listing.id, status="paid")
        .first()
    )
    if listing.status != "listed" and listing.seller_id != user.id and not bought:
        raise HTTPException(404, "作品已下架")
    detail = svc.listing_payload(listing)
    detail["version"] = svc.current_work_version(db, listing.id)
    detail["status"] = listing.status
    detail["user"] = seller.nickname or "训练伙伴"
    detail["favorite"] = db.get(WorkFavorite, (user.id, listing.id)) is not None
    comments = (
        db.query(MarketComment, User)
        .join(User, MarketComment.user_id == User.id)
        .filter(MarketComment.listing_id == listing.id)
        .order_by(MarketComment.created_at.asc())
        .all()
    )
    can_manage = seller.id == user.id or is_admin(user)
    detail["comments"] = []
    for c, u in comments:
        state = db.get(ReviewState, ("market_comment", c.id))
        hidden = state.hidden if state else False
        if hidden and not can_manage:
            continue
        detail["comments"].append(
            {
                "id": c.id,
                "user": u.nickname,
                "text": c.text,
                "created_at": c.created_at,
                "hidden": hidden,
                "can_manage": can_manage,
                "can_delete": can_manage or c.user_id == user.id,
            }
        )
    for item in detail["comments"]:
        item["replies"] = []
        for reply, actor in (
            db.query(MarketReply, User)
            .join(User, User.id == MarketReply.user_id)
            .filter(MarketReply.comment_id == item["id"])
            .order_by(MarketReply.id)
            .all()
        ):
            reply_state = db.get(ReviewState, ("market_reply", reply.id))
            reply_hidden = reply_state.hidden if reply_state else False
            if reply_hidden and not can_manage:
                continue
            item["replies"].append(
                {
                    "id": reply.id,
                    "text": reply.text,
                    "user": actor.nickname,
                    "hidden": reply_hidden,
                    "can_delete": can_manage or reply.user_id == user.id,
                }
            )
    detail["liked_by_me"] = (
        db.query(MarketLike)
        .filter(MarketLike.listing_id == listing.id, MarketLike.user_id == user.id)
        .first()
        is not None
    )
    detail["bought_by_me"] = (
        db.query(Purchase)
        .filter(
            Purchase.buyer_id == user.id,
            Purchase.listing_id == listing.id,
            Purchase.status == "paid",
        )
        .first()
        is not None
    )
    return detail


@router.post("/listings")
def publish_listing(
    body: ListingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listing = svc.create_listing(db, user, body)
    return {
        "listing_id": listing.id,
        "kind": listing.kind,
        "badge": svc._badge(listing),
        "message": "已上架",
    }


@router.post("/listings/{listing_id}/like")
def like_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listing, _ = svc.get_listing(db, listing_id)
    liked = svc.toggle_like(db, listing, user)
    return {"liked": liked, "likes": listing.likes_count}


@router.post("/listings/{listing_id}/comments")
def comment_listing(
    listing_id: int,
    body: CommentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    listing, _ = svc.get_listing(db, listing_id)
    c = svc.add_comment(db, listing, user, body.text)
    return {
        "id": c.id,
        "user": user.nickname or "训练伙伴",
        "text": c.text,
        "created_at": c.created_at,
    }


@router.post("/listings/{listing_id}/replicate")
def replicate_listing(
    listing_id: int,
    body: ReplicateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not settings.allow_demo_auth:
        raise HTTPException(503, "支付渠道尚未启用，暂不允许复刻付费商品")
    listing, _ = svc.get_listing(db, listing_id)
    order, node = svc.purchase(db, listing, user, body)
    return {
        "purchase_id": order.id,
        "node": svc.node_out(node),
        "total_paid_fen": order.total_paid_fen,
        "platform_cut_fen": order.platform_cut_fen,
        "creator_earn_fen": order.creator_earn_fen,
        "message": "已复刻，媒体已保留并写入训练节点库",
    }


@router.get("/nodes")
def my_nodes(
    kind: str | None = Query(default="all", description="all|plan|lesson"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    nodes = svc.list_nodes(db, user, kind=kind)
    items = []
    for n in nodes:
        pref = db.get(NodePreference, (user.id, n.id))
        items.append(
            {
                **svc.node_out(n),
                "favorite": pref.favorite if pref else False,
                "category": pref.category if pref else "",
            }
        )
    return {"items": items}


class NodePreferenceIn(BaseModel):
    favorite: bool
    category: str = Field(default="", max_length=32)


@router.post("/nodes/{node_id}/preferences")
def node_preferences(
    node_id: int,
    body: NodePreferenceIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.services.account_lock import lock_account

    lock_account(user, db)
    node = db.get(TrainingNode, node_id)
    if not node or node.owner_id != user.id:
        raise HTTPException(404, "节点不存在或无权修改")
    db.merge(
        NodePreference(
            user_id=user.id,
            node_id=node_id,
            favorite=body.favorite,
            category=body.category.strip(),
        )
    )
    db.commit()
    return {"ok": True}


@router.post("/assemble")
def assemble_plan(
    body: AssembleRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    plan = svc.assemble(db, user, body)
    return {
        "plan_id": plan.id,
        "title": plan.title,
        "cycle": plan.cycle,
        "days": json.loads(plan.days_json),
        "message": "已应用到训练（拼装方案生效）",
    }

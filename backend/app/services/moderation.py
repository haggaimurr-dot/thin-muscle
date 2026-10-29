from fastapi import HTTPException
from app.core.config import settings
from app.models.moderation import ReviewState, MarketReply
from app.models.entities import MarketListing, MarketComment
from app.models.home import FeedPost, FeedComment


def hidden_clause(db, kind, column):
    return (
        db.query(ReviewState)
        .filter(
            ReviewState.kind == kind,
            ReviewState.target_id == column,
            ReviewState.hidden.is_(True),
        )
        .exists()
    )


def is_admin(user):
    return user.id in settings.moderation_admin_ids


def target_info(db, kind, target_id):
    model = {
        "market": MarketListing,
        "market_comment": MarketComment,
        "post": FeedPost,
        "feed_comment": FeedComment,
        "market_reply": MarketReply,
    }[kind]
    row = db.get(model, target_id)
    if not row:
        raise HTTPException(404, "内容不存在或已删除")
    if kind == "market":
        return row, row.seller_id, row.title
    if kind == "post":
        return row, row.user_id, row.gains_json
    if kind == "market_reply":
        comment = db.get(MarketComment, row.comment_id)
        listing = db.get(MarketListing, comment.listing_id) if comment else None
        if not listing:
            raise HTTPException(404, "所属内容已删除")
        return row, listing.seller_id, row.text
    parent = (
        db.get(MarketListing, row.listing_id)
        if kind == "market_comment"
        else db.get(FeedPost, row.post_id)
    )
    if not parent:
        raise HTTPException(404, "所属内容已删除")
    return (
        row,
        parent.seller_id if kind == "market_comment" else parent.user_id,
        row.text,
    )

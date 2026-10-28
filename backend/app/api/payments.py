import hashlib
import hmac
import json
import secrets
import ssl
import time
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import update
from sqlalchemy.orm import Session
from app.api.auth import current_user, rate_limit
from app.core.config import settings
from app.core.db import get_db
from app.models.account import PaymentOrder
from app.models.entities import User, TrainingNode, Purchase
from app.schemas.market import ReplicateRequest
from app.services import market as svc

router = APIRouter(prefix="/payments", tags=["payments"])


def ready():
    return bool(
        settings.stripe_secret_key
        and settings.stripe_webhook_secret
        and settings.public_origin.startswith("https://")
    )


@router.post("/checkout/{listing_id}")
async def checkout(
    listing_id: int,
    body: ReplicateRequest,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if not ready():
        raise HTTPException(503, "支付尚未开通，请稍后再试")
    if not body.ack_weight or not body.ack_level:
        raise HTTPException(422, "请先确认体重与训练水平适配")
    rate_limit(request, db)
    listing, _ = svc.get_listing(db, listing_id)
    if listing.seller_id == user.id or listing.status != "listed":
        raise HTTPException(400, "该商品暂不可购买")
    if (
        db.query(Purchase)
        .filter_by(buyer_id=user.id, listing_id=listing.id, status="paid")
        .first()
    ):
        raise HTTPException(409, "已购买该商品")
    methods = settings.stripe_payment_methods
    if not methods or any(m not in ("card", "alipay", "wechat_pay") for m in methods):
        raise HTTPException(503, "支付方式配置无效")
    order = PaymentOrder(
        id=secrets.token_hex(16),
        user_id=user.id,
        listing_id=listing.id,
        amount=listing.price_fen,
        snapshot=json.dumps(svc.listing_payload(listing)),
    )
    db.add(order)
    db.commit()
    data = {
        "mode": "payment",
        "success_url": settings.public_origin + "/#/market?payment=return",
        "cancel_url": settings.public_origin + "/#/market?payment=cancel",
        "metadata[order_id]": order.id,
        "line_items[0][price_data][currency]": "cny",
        "line_items[0][price_data][unit_amount]": str(order.amount),
        "line_items[0][price_data][product_data][name]": listing.title,
        "line_items[0][quantity]": "1",
    }
    for i, m in enumerate(methods):
        data[f"payment_method_types[{i}]"] = m
    if "wechat_pay" in methods:
        data["payment_method_options[wechat_pay][client]"] = "web"
    try:
        async with httpx.AsyncClient(
            timeout=20, verify=ssl.create_default_context(), follow_redirects=False
        ) as client:
            response = await client.post(
                "https://api.stripe.com/v1/checkout/sessions",
                headers={
                    "Authorization": "Bearer " + settings.stripe_secret_key,
                    "Idempotency-Key": order.id,
                },
                data=data,
            )
            response.raise_for_status()
            result = response.json()
        from urllib.parse import urlsplit

        parsed = urlsplit(result["url"])
        if parsed.scheme != "https" or parsed.hostname != "checkout.stripe.com":
            raise ValueError()
        order.checkout_id = result["id"]
        db.commit()
        return {"url": result["url"], "order_id": order.id}
    except (httpx.HTTPError, ValueError, KeyError):
        raise HTTPException(502, "支付服务暂时不可用，请稍后重试")


@router.post("/stripe/webhook")
async def webhook(request: Request, db: Session = Depends(get_db)):
    if not settings.stripe_webhook_secret:
        raise HTTPException(503, "支付未配置")
    content = await request.body()
    if len(content) > 1024 * 1024:
        raise HTTPException(413, "回调过大")
    signature = request.headers.get("stripe-signature", "")
    try:
        pairs = [part.split("=", 1) for part in signature.split(",")]
        stamp = next(v for k, v in pairs if k == "t")
        if abs(time.time() - int(stamp)) > 300:
            raise ValueError()
        expected = hmac.new(
            settings.stripe_webhook_secret.encode(),
            stamp.encode() + b"." + content,
            hashlib.sha256,
        ).hexdigest()
        if not any(k == "v1" and hmac.compare_digest(v, expected) for k, v in pairs):
            raise ValueError()
        event = json.loads(content)
    except (ValueError, StopIteration):
        raise HTTPException(400, "回调签名无效")
    if event.get("type") not in (
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
    ):
        return {"ok": True}
    data = event.get("data", {}).get("object", {})
    order = db.get(PaymentOrder, data.get("metadata", {}).get("order_id", ""))
    if not order:
        raise HTTPException(400, "订单不存在")
    if (
        data.get("id") != order.checkout_id
        or data.get("amount_total") != order.amount
        or data.get("currency") != "cny"
        or data.get("mode") != "payment"
    ):
        raise HTTPException(400, "订单金额或标识不一致")
    if data.get("payment_status") != "paid":
        return {"ok": True}
    # Only the verified provider callback can atomically grant ownership.
    claimed = db.execute(
        update(PaymentOrder)
        .where(PaymentOrder.id == order.id, PaymentOrder.status == "pending")
        .values(status="paid")
    )
    if claimed.rowcount == 0:
        db.rollback()
        return {"ok": True}
    if (
        not db.query(Purchase)
        .filter_by(buyer_id=order.user_id, listing_id=order.listing_id, status="paid")
        .first()
    ):
        p = json.loads(order.snapshot)
        payload = {
            k: v
            for k, v in p.items()
            if k
            not in (
                "listing_id",
                "seller_id",
                "price_fen",
                "likes",
                "created_at",
                "badge",
            )
        }
        node = TrainingNode(
            owner_id=order.user_id,
            source_listing_id=order.listing_id,
            kind=p["kind"],
            title=p["title"],
            level=p["level"],
            body_range=p["body_range"],
            cover_url=p["cover_url"],
            media_json=json.dumps(p["media"]),
            body_text=p["body_text"],
            payload_json=json.dumps(payload),
        )
        db.add(node)
        db.flush()
        platform, creator = svc.fee_split_fen(order.amount)
        db.add(
            Purchase(
                buyer_id=order.user_id,
                listing_id=order.listing_id,
                seller_id=p["seller_id"],
                total_paid_fen=order.amount,
                platform_cut_fen=platform,
                creator_earn_fen=creator,
                ack_weight=True,
                ack_level=True,
                node_id=node.id,
                status="paid",
            )
        )
    db.commit()
    return {"ok": True}

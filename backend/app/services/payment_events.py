import json
from fastapi import HTTPException
from app.models.payment_events import PaymentEvent, PaymentReference


KINDS = {
    "charge.refunded",
    "charge.dispute.created",
    "charge.dispute.updated",
    "charge.dispute.closed",
}


def record_event(db, event, raw_digest, order_id=None):
    obj = event.get("data", {}).get("object", {})
    ref = obj.get("payment_intent") or ""
    if not isinstance(ref, str):
        raise HTTPException(400, "支付引用无效")
    eid = event.get("id") or "legacy:" + raw_digest
    if db.get(PaymentEvent, eid):
        return
    if order_id and ref:
        existing = db.get(PaymentReference, ref)
        if existing and existing.order_id != order_id:
            raise HTTPException(400, "支付引用与订单不一致")
        db.merge(PaymentReference(payment_intent=ref, order_id=order_id))
    facts = {
        key: obj.get(key)
        for key in ("id", "currency", "amount", "amount_refunded", "status")
    }
    from sqlalchemy.exc import IntegrityError

    try:
        with db.begin_nested():
            db.add(
                PaymentEvent(
                    event_id=eid,
                    kind=event["type"],
                    payment_intent=ref,
                    order_id=order_id,
                    created=event.get("created", 0),
                    facts=json.dumps(facts),
                )
            )
            db.flush()
    except IntegrityError:
        pass


def order_facts(db, order):
    link = db.query(PaymentReference).filter_by(order_id=order.id).first()
    query = db.query(PaymentEvent)
    if link:
        from sqlalchemy import or_

        query = query.filter(
            or_(
                PaymentEvent.order_id == order.id,
                PaymentEvent.payment_intent == link.payment_intent,
            )
        )
    else:
        query = query.filter_by(order_id=order.id)
    events = query.order_by(PaymentEvent.created, PaymentEvent.event_id).all()
    refunded = 0
    disputes = {}
    for event in events:
        f = json.loads(event.facts)
        if event.kind == "charge.refunded" and f.get("currency") == "cny":
            value = f.get("amount_refunded")
            if type(value) is int and 0 <= value <= order.amount:
                refunded = max(refunded, value)
        if event.kind.startswith("charge.dispute."):
            disputes[f.get("id")] = f.get("status")
    return {
        "refunded_fen": refunded,
        "disputes": list(disputes.values()),
        "events": [
            {"id": e.event_id, "type": e.kind, "created": e.created} for e in events
        ],
    }

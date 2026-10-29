import json
from datetime import UTC, datetime
from zoneinfo import ZoneInfo
from sqlalchemy.exc import IntegrityError
from app.models.account import ReminderSetting, ReminderDelivery, RecoveryEmail
from app.services import mail


def tick(db, now=None):
    now = now or datetime.now(UTC)
    for setting in db.query(ReminderSetting).all():
        config = json.loads(setting.payload)
        if not config.get("enabled"):
            continue
        local = now.astimezone(ZoneInfo(config["timezone"]))
        address = db.get(RecoveryEmail, setting.user_id)
        if not address or not mail.ready():
            continue
        for kind in ["training", "recovery"]:
            if (
                local.isoweekday() not in config[kind + "_days"]
                or local.strftime("%H:%M") < config[kind + "_time"]
            ):
                continue
            key = (setting.user_id, local.date().isoformat(), kind)
            if db.get(ReminderDelivery, key):
                continue
            # Claim before sending. A second worker cannot send the same scheduled item.
            db.add(
                ReminderDelivery(
                    user_id=key[0], day=key[1], kind=kind, status="sending"
                )
            )
            try:
                db.commit()
            except IntegrityError:
                db.rollback()
                continue
            row = db.get(ReminderDelivery, key)
            try:
                mail.send_reminder(address.email, kind)
                row.status = "sent"
            except (OSError, ValueError):
                row.status = "failed"
            db.commit()

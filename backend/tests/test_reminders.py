import unittest, json
from datetime import UTC, datetime
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.core.db import Base
from app.models.entities import User
from app.models.account import ReminderSetting, ReminderDelivery, RecoveryEmail
from app.api.reminders import ReminderConfig
from app.services.reminders import tick
from pydantic import ValidationError


class ReminderTests(unittest.TestCase):
    def test_timezone_due_dedup_disable_and_failure(self):
        engine = create_engine("sqlite://")
        Base.metadata.create_all(engine)
        with Session(engine) as db:
            user = User(openid="reminder-test", nickname="test")
            db.add(user)
            db.flush()
            config = ReminderConfig(
                enabled=True, training_time="07:00", recovery_time="21:00"
            ).model_dump()
            setting = ReminderSetting(user_id=user.id, payload=json.dumps(config))
            db.add_all(
                [setting, RecoveryEmail(user_id=user.id, email="test@example.test")]
            )
            db.commit()
            now = datetime(2026, 10, 28, 0, 0, tzinfo=UTC)  # Wed 08:00 Asia/Shanghai
            with (
                patch("app.services.reminders.mail.ready", return_value=True),
                patch("app.services.reminders.mail.send_reminder") as send,
            ):
                tick(db, now)
                tick(db, now)
                self.assertEqual(send.call_count, 1)
                self.assertEqual(db.query(ReminderDelivery).one().status, "sent")
                config["enabled"] = False
                setting.payload = json.dumps(config)
                db.commit()
                tick(db, datetime(2026, 10, 30, 0, 0, tzinfo=UTC))
                self.assertEqual(send.call_count, 1)
                config["enabled"] = True
                setting.payload = json.dumps(config)
                db.commit()
                send.side_effect = OSError("provider unavailable")
                tick(db, datetime(2026, 10, 30, 0, 0, tzinfo=UTC))
                self.assertEqual(
                    db.query(ReminderDelivery).filter_by(day="2026-10-30").one().status,
                    "failed",
                )
        engine.dispose()

    def test_invalid_timezone_and_days(self):
        for values in [
            {"timezone": "invalid-zone"},
            {"training_days": [8]},
            {"training_days": [True]},
            {"training_time": "25:00"},
            {"recovery_days": [1, 1]},
        ]:
            with self.assertRaises(ValidationError):
                ReminderConfig(**values)

import time
import unittest

from fastapi import HTTPException
from fastapi.testclient import TestClient
from test_accounts import app, payload

from app.api.sync import validate
from app.core.db import SessionLocal
from app.models.account import LoginAttempt


class PeriodGoalTests(unittest.TestCase):
    def test_validation_and_legacy_payload(self):
        validate(payload())
        for period, strength in [
            ("2025-02", 29),
            ("2026-13", 1),
            ("2026", 366),
            ("2026-01", True),
            ("2026-01", 1.5),
            ("2026-01", 0),
        ]:
            with self.assertRaises(HTTPException):
                validate(
                    {
                        **payload(),
                        "goals": {
                            period: {"strength_days": strength, "protein_days": 20}
                        },
                    }
                )
        validate(
            {
                **payload(),
                "goals": {
                    "2024-02": {"strength_days": 29, "protein_days": 29},
                    "2024": {"strength_days": 366, "protein_days": 366},
                },
            }
        )

    def test_sync_preserves_goals_for_old_clients_conflicts_and_isolation(self):
        with TestClient(app) as a, TestClient(app) as b:
            with SessionLocal() as db:
                db.query(LoginAttempt).delete()
                db.commit()
            for client in (a, b):
                result = client.post(
                    "/api/v1/auth/register",
                    json={
                        "username": "goal_" + str(time.time_ns()),
                        "password": "Goal-password-123",
                    },
                )
                self.assertEqual(result.status_code, 200, result.text)
                client.headers["X-CSRF-Token"] = result.json()["csrf"]
            data = {
                **payload(),
                "goals": {"2026-10": {"strength_days": 8, "protein_days": 20}},
            }
            result = a.put("/api/v1/data", json={"revision": 0, "data": data})
            self.assertEqual(result.status_code, 200, result.text)
            self.assertEqual(b.get("/api/v1/data").json()["data"], None)
            self.assertEqual(
                a.get("/api/v1/data").json()["data"]["goals"], data["goals"]
            )
            legacy = a.put("/api/v1/data", json={"revision": 1, "data": payload()})
            self.assertEqual(legacy.status_code, 200, legacy.text)
            self.assertEqual(
                a.get("/api/v1/data").json()["data"]["goals"], data["goals"]
            )
            self.assertEqual(
                a.put("/api/v1/data", json={"revision": 1, "data": data}).status_code,
                409,
            )

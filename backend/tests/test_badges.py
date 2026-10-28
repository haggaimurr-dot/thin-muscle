import unittest
from datetime import date
from fastapi.testclient import TestClient
from test_accounts import app, payload
from app.services.badges import metrics


class BadgeMetricsTests(unittest.TestCase):
    def test_unique_dates_future_records_and_balanced_streak(self):
        data = payload()
        data["done"] = {
            "2026-01-05": {"1": True, "2": True, "3": True},
            "2026-01-12": {"1": True, "3": True},
            "2026-01-19": {"1": True, "3": "true"},
            "2099-01-05": {"1": True, "3": True},
        }
        data["protein"] = {
            "2026-01-05": {"1": 150, "2": 149.9, "8": 200},
            "2099-01-05": {"1": 200},
        }
        data["logs"] = {
            "2026-01-05|1-am": [
                {"name": "pushup", "note": "稳住动作"},
                {"name": "press", "note": "动作改善"},
            ],
            "2026-01-05|1-pm": [{"name": "walk", "note": "恢复"}],
            "2026-01-05|3-am": [{"name": "pull", "note": "  "}],
            "2099-01-05|1-am": [{"name": "future", "note": "未发生"}],
        }
        self.assertEqual(
            metrics(data, today=date(2026, 1, 20)),
            dict(
                strength_days=5,
                protein_days=1,
                journal_days=1,
                valid_weeks=2,
                longest_streak=2,
                balanced_weeks=1,
            ),
        )

    def test_gap_breaks_consecutive_weeks_but_not_cumulative(self):
        data = payload()
        data["done"] = {
            "2026-01-05": {"1": True, "3": True},
            "2026-01-19": {"1": True, "3": True},
        }
        stats = metrics(data, today=date(2026, 1, 23))
        self.assertEqual(stats["valid_weeks"], 2)
        self.assertEqual(stats["longest_streak"], 1)

    def test_awards_are_account_scoped_persistent_and_idempotent(self):
        with TestClient(app) as client:
            r = client.post(
                "/api/v1/auth/register",
                json={"username": "badge_owner", "password": "badge-password-123"},
            )
            self.assertEqual(r.status_code, 200, r.text)
            csrf = r.json()["csrf"]
            data = payload()
            data["done"] = {"2026-01-05": {"1": True}}
            saved = client.put(
                "/api/v1/data",
                headers={"X-CSRF-Token": csrf},
                json={"revision": 0, "data": data},
            )
            self.assertEqual(saved.status_code, 200, saved.text)
            self.assertEqual(
                [b["id"] for b in saved.json()["new_badges"]], ["strength-1"]
            )
            saved = client.put(
                "/api/v1/data",
                headers={"X-CSRF-Token": csrf},
                json={"revision": 1, "data": data},
            )
            self.assertEqual(saved.json()["new_badges"], [])
            saved = client.put(
                "/api/v1/data",
                headers={"X-CSRF-Token": csrf},
                json={"revision": 2, "data": payload()},
            )
            self.assertEqual(saved.status_code, 200, saved.text)
            items = client.get("/api/v1/badges").json()["items"]
            first = next(b for b in items if b["id"] == "strength-1")
            self.assertIsNotNone(first["earned_at"])
            self.assertEqual(first["current"], 0)
            with TestClient(app) as other:
                r = other.post(
                    "/api/v1/auth/register",
                    json={"username": "badge_other", "password": "other-password-123"},
                )
                self.assertEqual(r.status_code, 200, r.text)
                self.assertEqual(other.get("/api/v1/badges").json()["earned_count"], 0)
            self.assertEqual(
                TestClient(app)
                .get("/api/v1/badges", headers={"X-User-Id": "4"})
                .status_code,
                401,
            )

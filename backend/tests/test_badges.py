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


class BadgeGoalsTests(unittest.TestCase):
    def test_weekly_goals_exclude_other_weeks_future_days_and_duplicates(self):
        from app.services.badges import weekly_goals

        data = payload()
        data["done"] = {
            "2026-01-05": {"1": True, "3": True},
            "2026-01-12": {"1": True, "2": True, "3": True, "4": True, "5": True},
        }
        data["logs"] = {
            "2026-01-12|1-am": [
                {"name": "a", "note": "steady"},
                {"name": "b", "note": "steady"},
            ],
            "2026-01-12|1-pm": [{"name": "a", "note": "steady"}],
            "2026-01-12|5-am": [{"name": "future", "note": "future"}],
        }
        result = weekly_goals(data, today=date(2026, 1, 14))
        self.assertEqual(result["week"], "2026-01-12")
        self.assertEqual([g["current"] for g in result["items"]], [2, 1, 1])
        self.assertEqual([g["target"] for g in result["items"]], [2, 1, 1])

    def test_featured_badges_must_be_earned_and_are_private(self):
        with TestClient(app) as owner:
            r = owner.post(
                "/api/v1/auth/register",
                json={"username": "wear_owner", "password": "wear-owner-password"},
            )
            self.assertEqual(r.status_code, 200, r.text)
            headers = {"X-CSRF-Token": r.json()["csrf"]}
            self.assertEqual(
                owner.put(
                    "/api/v1/badges/featured",
                    headers=headers,
                    json={"badge_id": "strength-100"},
                ).status_code,
                403,
            )
            data = payload()
            data["done"] = {"2026-01-05": {"1": True}}
            self.assertEqual(
                owner.put(
                    "/api/v1/data", headers=headers, json={"revision": 0, "data": data}
                ).status_code,
                200,
            )
            result = owner.put(
                "/api/v1/badges/featured",
                headers=headers,
                json={"badge_id": "strength-1"},
            )
            self.assertEqual(result.status_code, 200, result.text)
            self.assertEqual(
                owner.get("/api/v1/badges").json()["featured_id"], "strength-1"
            )
            with TestClient(app) as other:
                r = other.post(
                    "/api/v1/auth/register",
                    json={"username": "wear_other", "password": "wear-other-password"},
                )
                self.assertEqual(r.status_code, 200, r.text)
                self.assertIsNone(other.get("/api/v1/badges").json()["featured_id"])
                self.assertEqual(
                    other.put(
                        "/api/v1/badges/featured",
                        headers={"X-CSRF-Token": r.json()["csrf"]},
                        json={"badge_id": "strength-1"},
                    ).status_code,
                    403,
                )
            self.assertEqual(
                owner.put(
                    "/api/v1/badges/featured", json={"badge_id": None}
                ).status_code,
                403,
            )
            self.assertEqual(
                owner.put(
                    "/api/v1/badges/featured", headers=headers, json={"badge_id": None}
                ).status_code,
                200,
            )
            self.assertIsNone(owner.get("/api/v1/badges").json()["featured_id"])

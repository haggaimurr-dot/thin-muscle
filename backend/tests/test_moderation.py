import unittest, time
from unittest.mock import patch
from fastapi.testclient import TestClient
from test_accounts import app
from app.core.db import SessionLocal
from app.core.config import settings
from app.models.account import LoginAttempt
from app.models.entities import MarketListing, MarketComment
from app.models.moderation import ReviewLog


class ModerationTests(unittest.TestCase):
    def setUp(self):
        self.a = TestClient(app)
        self.a.__enter__()
        self.b = TestClient(app)
        self.admin = TestClient(app)
        with SessionLocal() as db:
            db.query(LoginAttempt).delete()
            db.commit()
        self.users = []
        for c in [self.a, self.b, self.admin]:
            r = c.post(
                "/api/v1/auth/register",
                json={
                    "username": "mod_" + str(time.time_ns()),
                    "password": "Moderation-password-123",
                },
            )
            self.assertEqual(r.status_code, 200, r.text)
            c.headers["X-CSRF-Token"] = r.json()["csrf"]
            self.users.append(r.json()["user"]["id"])

    def tearDown(self):
        self.b.close()
        self.admin.close()
        self.a.__exit__(None, None, None)

    def test_report_dedup_owner_permission_hide_restore_and_audit(self):
        with SessionLocal() as db:
            l = MarketListing(
                seller_id=self.users[0],
                kind="lesson",
                title="Review work",
                level="入门",
                price_fen=100,
            )
            db.add(l)
            db.flush()
            c = MarketComment(
                listing_id=l.id, user_id=self.users[1], text="Review comment"
            )
            db.add(c)
            db.commit()
            lid, cid = l.id, c.id
        body = {"kind": "market_comment", "target_id": cid, "reason": "测试举报"}
        first = self.b.post("/api/v1/moderation/reports", json=body)
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(
            first.json()["id"],
            self.b.post("/api/v1/moderation/reports", json=body).json()["id"],
        )
        self.assertEqual(self.b.get("/api/v1/moderation/reports").status_code, 403)
        path = f"/api/v1/moderation/market_comment/{cid}/review"
        self.assertEqual(self.b.post(path, json={"hidden": True}).status_code, 403)
        self.assertEqual(self.a.post(path, json={"hidden": True}).status_code, 200)
        self.assertEqual(
            self.b.get(f"/api/v1/market/listings/{lid}").json()["comments"], []
        )
        self.assertTrue(
            self.a.get(f"/api/v1/market/listings/{lid}").json()["comments"][0]["hidden"]
        )
        with patch.object(settings, "moderation_admin_ids", [self.users[2]]):
            self.assertEqual(
                self.admin.get("/api/v1/moderation/reports").status_code, 200
            )
            self.assertEqual(
                self.admin.post(path, json={"hidden": False}).status_code, 200
            )
            self.assertEqual(
                len(self.b.get(f"/api/v1/market/listings/{lid}").json()["comments"]), 1
            )
            self.assertEqual(
                self.admin.post(
                    f"/api/v1/moderation/market/{lid}/review", json={"hidden": True}
                ).status_code,
                200,
            )
            self.assertEqual(
                self.b.get(f"/api/v1/market/listings/{lid}").status_code, 404
            )
            self.assertNotIn(
                lid,
                [
                    r["listing_id"]
                    for r in self.b.get("/api/v1/market/listings").json()["items"]
                ],
            )
            self.assertNotIn(
                lid,
                [
                    r["listing_id"]
                    for r in self.b.get("/api/v1/market/recommendations").json()[
                        "items"
                    ]
                ],
            )
        with SessionLocal() as db:
            self.assertGreaterEqual(db.query(ReviewLog).count(), 3)

    def test_publish_delete_ownership_and_reported_deleted_content(self):
        response = self.a.post("/api/v1/home/posts", json={"text": "我的训练心得"})
        self.assertEqual(response.status_code, 200, response.text)
        pid = response.json()["post_id"]
        self.assertIn(
            pid, [r["post_id"] for r in self.a.get("/api/v1/home/feed").json()["items"]]
        )
        self.assertEqual(self.b.delete(f"/api/v1/home/feed/{pid}").status_code, 404)
        self.b.post(
            "/api/v1/moderation/reports",
            json={"kind": "post", "target_id": pid, "reason": "测试内容"},
        )
        self.assertEqual(self.a.delete(f"/api/v1/home/feed/{pid}").status_code, 200)
        with patch.object(settings, "moderation_admin_ids", [self.users[2]]):
            reports = self.admin.get("/api/v1/moderation/reports").json()["items"]
            item = next(
                r for r in reports if r["target_id"] == pid and r["kind"] == "post"
            )
            self.assertEqual(item["status"], "deleted")
            self.assertIn("已删除", item["text"])
        self.assertEqual(
            self.a.post("/api/v1/home/posts", json={"text": "   "}).status_code, 422
        )

    def test_delete_comment_cascades_replies_and_checks_roles(self):
        with SessionLocal() as db:
            work = MarketListing(
                seller_id=self.users[0],
                kind="lesson",
                title="Delete test",
                level="入门",
                price_fen=100,
            )
            db.add(work)
            db.commit()
            lid = work.id
        comment = self.b.post(
            f"/api/v1/market/listings/{lid}/comments", json={"text": "own comment"}
        )
        self.assertEqual(comment.status_code, 200, comment.text)
        cid = comment.json()["id"]
        self.a.post(
            f"/api/v1/market/comments/{cid}/replies", json={"text": "seller reply"}
        )
        self.assertEqual(
            self.admin.delete(f"/api/v1/market/comments/{cid}").status_code, 403
        )
        self.assertEqual(
            self.b.delete(f"/api/v1/market/comments/{cid}").status_code, 200
        )
        self.assertEqual(
            self.a.get(f"/api/v1/market/listings/{lid}").json()["comments"], []
        )
        self.assertEqual(
            self.b.delete(f"/api/v1/market/comments/{cid}").status_code, 404
        )
        self.assertEqual(self.b.post("/api/v1/home/rank/refresh").status_code, 403)

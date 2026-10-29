import unittest, time
from fastapi.testclient import TestClient
from test_accounts import app
from app.core.db import SessionLocal
from app.models.account import LoginAttempt


class NotificationTests(unittest.TestCase):
    def test_isolation_dedup_read_and_user_search(self):
        with TestClient(app) as a, TestClient(app) as b:
            with SessionLocal() as db:
                db.query(LoginAttempt).delete()
                db.commit()
            ids = []
            names = []
            for client in [a, b]:
                name = "notice_" + str(time.time_ns())
                names.append(name)
                r = client.post(
                    "/api/v1/auth/register",
                    json={"username": name, "password": "Notice-password-123"},
                )
                self.assertEqual(r.status_code, 200, r.text)
                ids.append(r.json()["user"]["id"])
                client.headers["X-CSRF-Token"] = r.json()["csrf"]
            self.assertEqual(a.post(f"/api/v1/home/follows/{ids[1]}").status_code, 200)
            data = b.get("/api/v1/notifications").json()
            self.assertEqual(data["unread"], 1)
            nid = data["items"][0]["id"]
            self.assertEqual(a.get("/api/v1/notifications").json()["items"], [])
            self.assertEqual(
                a.post(f"/api/v1/notifications/{nid}/read").status_code, 404
            )
            self.assertEqual(
                b.post(f"/api/v1/notifications/{nid}/read").status_code, 200
            )
            self.assertEqual(b.get("/api/v1/notifications").json()["unread"], 0)
            a.post(f"/api/v1/home/follows/{ids[1]}")
            a.post(f"/api/v1/home/follows/{ids[1]}")
            self.assertEqual(len(b.get("/api/v1/notifications").json()["items"]), 1)
            found = a.get("/api/v1/home/discover", params={"q": names[1]}).json()[
                "items"
            ]
            self.assertEqual([u["user_id"] for u in found], [ids[1]])
            post = b.post("/api/v1/home/posts", json={"text": "通知测试动态"}).json()[
                "post_id"
            ]
            self.assertEqual(a.post(f"/api/v1/home/feed/{post}/like").status_code, 200)
            self.assertEqual(
                a.post(
                    f"/api/v1/home/feed/{post}/comments", json={"text": "支持"}
                ).status_code,
                200,
            )
            self.assertEqual(b.get("/api/v1/notifications").json()["unread"], 2)
            self.assertEqual(b.post("/api/v1/notifications/read-all").status_code, 200)
            self.assertEqual(b.get("/api/v1/notifications").json()["unread"], 0)

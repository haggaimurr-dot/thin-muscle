import time
import unittest
from fastapi.testclient import TestClient
from test_accounts import app
from app.core.db import SessionLocal
from app.models.entities import User
from app.models.account import LoginAttempt
from app.services.home import public_profile


class ProfileTests(unittest.TestCase):
    def test_private_fields_only_show_when_opted_in(self):
        with TestClient(app) as c:
            with SessionLocal() as db:
                db.query(LoginAttempt).delete()
                db.commit()
            r = c.post(
                "/api/v1/auth/register",
                json={
                    "username": "profile_" + str(time.time_ns()),
                    "password": "Profile-Password-123",
                },
            )
            self.assertEqual(r.status_code, 200, r.text)
            user_id = r.json()["user"]["id"]
            c.headers["X-CSRF-Token"] = r.json()["csrf"]
            body = {
                "nickname": "公开昵称",
                "avatar_url": "https://example.com/avatar.png",
                "bio": "私有简介",
                "show_bio": False,
                "show_avatar": False,
            }
            self.assertEqual(c.put("/api/v1/home/profile", json=body).status_code, 200)
            with SessionLocal() as db:
                out = public_profile(db, db.get(User, user_id))
                self.assertEqual((out["bio"], out["avatar_url"]), ("", ""))
            c.put(
                "/api/v1/home/profile",
                json={**body, "show_bio": True, "show_avatar": True},
            )
            with SessionLocal() as db:
                out = public_profile(db, db.get(User, user_id))
                self.assertEqual(out["bio"], "私有简介")
                self.assertEqual(out["avatar_url"], body["avatar_url"])
            self.assertEqual(
                c.put(
                    "/api/v1/home/profile",
                    json={**body, "avatar_url": "javascript:alert(1)"},
                ).status_code,
                422,
            )
            self.assertEqual(
                TestClient(app).get("/api/v1/home/profile").status_code, 401
            )

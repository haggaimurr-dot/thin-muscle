import os
import tempfile
import unittest
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///" + str(
    Path(tempfile.mkdtemp()) / "accounts.db"
)
os.environ["COOKIE_SECURE"] = "false"
os.environ["SEED_DEMO_DATA"] = "false"
os.environ["ALLOW_DEMO_AUTH"] = "false"
from fastapi.testclient import TestClient
from app.main import app


def payload():
    return dict(
        phase=1,
        logs={},
        done={},
        protein={},
        hits={},
        checks={},
        videos={},
        meals=[],
        ai=[],
        plans={},
    )


class AccountTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.context = TestClient(app)
        cls.context.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.context.__exit__(None, None, None)

    def account(self, name):
        client = TestClient(app)
        result = client.post(
            "/api/v1/auth/register",
            json={"username": name, "password": "Password-test-123"},
        )
        self.assertEqual(result.status_code, 200, result.text)
        return client, result.json()["csrf"]

    def test_spoofing_csrf_logout_and_isolation(self):
        self.assertEqual(
            self.context.get(
                "/api/v1/home/stats", headers={"X-User-Id": "4"}
            ).status_code,
            401,
        )
        a, csrf = self.account("first_user")
        b, other = self.account("second_user")
        data = payload()
        data["protein"] = {"2026-10-26": {"1": 155}}
        self.assertEqual(
            a.put("/api/v1/data", json={"revision": 0, "data": data}).status_code, 403
        )
        self.assertEqual(
            a.put(
                "/api/v1/data",
                headers={"X-CSRF-Token": csrf},
                json={"revision": 0, "data": data},
            ).status_code,
            200,
        )
        self.assertEqual(b.get("/api/v1/data").json(), {"revision": 0, "data": None})
        self.assertEqual(
            a.get("/api/v1/data").json()["data"]["protein"], data["protein"]
        )
        conflict = a.put(
            "/api/v1/data",
            headers={"X-CSRF-Token": csrf},
            json={"revision": 0, "data": payload()},
        )
        self.assertEqual(conflict.status_code, 409)
        self.assertEqual(
            a.post("/api/v1/auth/logout", headers={"X-CSRF-Token": csrf}).status_code,
            200,
        )
        self.assertEqual(a.get("/api/v1/data").status_code, 401)
        a.close()
        b.close()

    def test_password_session_and_cross_origin(self):
        a, csrf = self.account("password_user")
        self.assertEqual(
            a.post(
                "/api/v1/auth/login",
                json={"username": "password_user", "password": "not-the-password"},
            ).status_code,
            401,
        )
        result = a.post(
            "/api/v1/auth/login",
            json={"username": "PASSWORD_USER", "password": "Password-test-123"},
        )
        self.assertEqual(result.status_code, 200)
        self.assertIn("HttpOnly", result.headers["set-cookie"])
        self.assertNotIn("Password-test-123", result.text)
        self.assertNotIn("password_hash", result.json())
        self.assertEqual(a.get("/api/v1/auth/me").status_code, 200)
        self.assertEqual(
            a.post(
                "/api/v1/auth/login",
                headers={"Origin": "https://evil.example"},
                json={"username": "password_user", "password": "Password-test-123"},
            ).status_code,
            403,
        )
        a.close()

    def test_validation_and_payment_closed(self):
        a, csrf = self.account("validate_user")
        self.assertEqual(
            a.post(
                "/api/v1/auth/register", json={"username": "bad", "password": "123"}
            ).status_code,
            422,
        )
        self.assertEqual(
            a.put(
                "/api/v1/data",
                headers={"X-CSRF-Token": csrf},
                json={"revision": 0, "data": {"phase": 1}},
            ).status_code,
            422,
        )
        self.assertEqual(
            a.post(
                "/api/v1/market/listings/123/replicate",
                headers={"X-CSRF-Token": csrf},
                json={"ack_weight": True, "ack_level": True},
            ).status_code,
            503,
        )
        a.close()


if __name__ == "__main__":
    unittest.main()

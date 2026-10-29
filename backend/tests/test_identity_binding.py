import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import AsyncMock, patch
from urllib.parse import parse_qs, urlsplit

from fastapi.testclient import TestClient
from test_accounts import app
from test_integrations import upstream

from app.core.config import settings
from app.core.db import SessionLocal
from app.models.account import Account, ExternalIdentity, LoginAttempt


class BindingTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.client.__enter__()
        with SessionLocal() as db:
            db.query(LoginAttempt).delete()
            db.commit()
        self.name = "binding_" + str(time.time_ns())
        result = self.client.post(
            "/api/v1/auth/register",
            json={"username": self.name, "password": "Binding-password-123"},
        )
        self.assertEqual(result.status_code, 200, result.text)
        self.user_id = result.json()["user"]["id"]
        self.headers = {"X-CSRF-Token": result.json()["csrf"]}
        self.phone = "+86138" + str(time.time_ns())[-8:]

    def tearDown(self):
        self.client.__exit__(None, None, None)

    def bind_phone(self, client=None, headers=None, phone=None):
        with patch(
            "app.api.identity.verify_request",
            new_callable=AsyncMock,
            return_value={"status": "approved"},
        ):
            return (client or self.client).post(
                "/api/v1/auth/identities/sms",
                headers=headers or self.headers,
                json={"phone": phone or self.phone, "code": "123456"},
            )

    def test_phone_binds_same_account_conflicts_and_last_method_protected(self):
        response = self.client.post(
            "/api/v1/auth/identities/unlink",
            headers=self.headers,
            json={"key": "password"},
        )
        self.assertEqual(response.status_code, 409)
        with patch(
            "app.api.identity.verify_request",
            new_callable=AsyncMock,
            return_value={"status": "pending"},
        ):
            self.assertEqual(
                self.client.post(
                    "/api/v1/auth/identities/sms",
                    headers=self.headers,
                    json={"phone": self.phone, "code": "123456"},
                ).status_code,
                400,
            )
        self.assertEqual(self.bind_phone().status_code, 200)
        self.assertEqual(self.bind_phone().status_code, 200)
        items = self.client.get("/api/v1/auth/identities").json()["items"]
        self.assertEqual(len(items), 2)
        self.assertNotIn(self.phone, str(items))
        other = TestClient(app)
        result = other.post(
            "/api/v1/auth/register",
            json={
                "username": "other_" + str(time.time_ns()),
                "password": "Other-password-123",
            },
        )
        other_headers = {"X-CSRF-Token": result.json()["csrf"]}
        self.assertEqual(self.bind_phone(other, other_headers).status_code, 409)
        outsider_key = next(item["key"] for item in items if item["kind"] == "phone")
        self.assertEqual(
            other.post(
                "/api/v1/auth/identities/unlink",
                headers=other_headers,
                json={"key": outsider_key},
            ).status_code,
            404,
        )
        with patch(
            "app.api.identity.verify_request",
            new_callable=AsyncMock,
            return_value={"status": "approved"},
        ):
            signed = other.post(
                "/api/v1/auth/sms/login", json={"phone": self.phone, "code": "123456"}
            )
        self.assertEqual(signed.json()["user"]["id"], self.user_id)
        unlinked = self.client.post(
            "/api/v1/auth/identities/unlink",
            headers=self.headers,
            json={"key": outsider_key},
        )
        self.assertEqual(unlinked.status_code, 200, unlinked.text)
        self.assertEqual(other.get("/api/v1/auth/me").status_code, 401)
        self.assertEqual(
            len(self.client.get("/api/v1/auth/identities").json()["items"]), 1
        )
        other.close()

    def test_password_can_be_added_to_external_account(self):
        phone_client = TestClient(app)
        with patch(
            "app.api.identity.verify_request",
            new_callable=AsyncMock,
            return_value={"status": "approved"},
        ):
            signed = phone_client.post(
                "/api/v1/auth/sms/login", json={"phone": self.phone, "code": "123456"}
            )
        headers = {"X-CSRF-Token": signed.json()["csrf"]}
        body = {"username": self.name, "password": "Phone-password-123"}
        self.assertEqual(
            phone_client.post(
                "/api/v1/auth/identities/password", headers=headers, json=body
            ).status_code,
            409,
        )
        body["username"] = "phone_" + str(time.time_ns())
        linked = phone_client.post(
            "/api/v1/auth/identities/password", headers=headers, json=body
        )
        self.assertEqual(linked.status_code, 200, linked.text)
        signed_password = TestClient(app).post("/api/v1/auth/login", json=body)
        self.assertEqual(
            signed_password.json()["user"]["id"], signed.json()["user"]["id"]
        )
        self.assertEqual(
            phone_client.post(
                "/api/v1/auth/identities/password", headers=headers, json=body
            ).status_code,
            409,
        )
        phone_client.close()

    def test_concurrent_unlink_cannot_remove_all_methods(self):
        self.assertEqual(self.bind_phone().status_code, 200)
        items = self.client.get("/api/v1/auth/identities").json()["items"]
        cookies = dict(self.client.cookies)

        def remove(item):
            with TestClient(app, cookies=cookies) as client:
                return client.post(
                    "/api/v1/auth/identities/unlink",
                    headers=self.headers,
                    json={"key": item["key"]},
                ).status_code

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(remove, items))
        self.assertEqual(sorted(results), [200, 409])
        with SessionLocal() as db:
            count = (
                db.query(Account).filter_by(user_id=self.user_id).count()
                + db.query(ExternalIdentity).filter_by(user_id=self.user_id).count()
            )
            self.assertEqual(count, 1)

    def test_wechat_binding_checks_initiator_and_unique_identity(self):
        with patch.multiple(
            settings,
            wx_web_app_id="test-web",
            wx_web_app_secret="test-secret",
            public_origin="https://training.example.test",
        ):
            response = self.client.post(
                "/api/v1/auth/identities/wechat/start",
                headers=self.headers,
                json={"kind": "web"},
            )
            self.assertEqual(response.status_code, 200, response.text)
            state = parse_qs(urlsplit(response.json()["url"]).query)["state"][0]
            self.client.cookies.set(
                "thin_muscle_oauth_state", state, path="/api/v1/auth/wechat/"
            )
            with patch(
                "app.api.identity.httpx.AsyncClient",
                return_value=upstream(
                    {"openid": "unique-openid", "unionid": "unique-union"}
                ),
            ):
                callback = self.client.get(
                    "/api/v1/auth/wechat/callback",
                    params={"code": "test", "state": state},
                    follow_redirects=False,
                )
            self.assertEqual(callback.status_code, 303, callback.text)
            self.assertIn("identity_bound=1", callback.headers["location"])
            with SessionLocal() as db:
                self.assertEqual(
                    db.get(ExternalIdentity, "wx-union:unique-union").user_id,
                    self.user_id,
                )
            # State is single-use.
            self.assertEqual(
                self.client.get(
                    "/api/v1/auth/wechat/callback",
                    params={"code": "test", "state": state},
                    follow_redirects=False,
                ).status_code,
                400,
            )
            response = self.client.post(
                "/api/v1/auth/identities/wechat/start",
                headers=self.headers,
                json={"kind": "web"},
            )
            state = parse_qs(urlsplit(response.json()["url"]).query)["state"][0]
            other = TestClient(app)
            other.post(
                "/api/v1/auth/register",
                json={
                    "username": "wx_other_" + str(time.time_ns()),
                    "password": "Other-password-123",
                },
            )
            other.cookies.set(
                "thin_muscle_oauth_state", state, path="/api/v1/auth/wechat/"
            )
            denied = other.get(
                "/api/v1/auth/wechat/callback",
                params={"code": "test", "state": state},
                follow_redirects=False,
            )
            self.assertEqual(denied.status_code, 403, denied.text)
            other.close()

    def test_unconfigured_channels_and_missing_csrf(self):
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/identities/password",
                json={"username": "unsafe", "password": "Example-password"},
            ).status_code,
            403,
        )
        with patch("app.api.identity.sms_ready", return_value=False):
            self.assertEqual(
                self.client.post(
                    "/api/v1/auth/identities/sms",
                    headers=self.headers,
                    json={"phone": self.phone, "code": "123456"},
                ).status_code,
                503,
            )
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/identities/wechat/start",
                headers=self.headers,
                json={"kind": "web"},
            ).status_code,
            503,
        )

    def test_password_unlink_requires_a_configured_fallback(self):
        self.assertEqual(self.bind_phone().status_code, 200)
        with patch("app.api.identity.sms_ready", return_value=False):
            denied = self.client.post(
                "/api/v1/auth/identities/unlink",
                headers=self.headers,
                json={"key": "password"},
            )
            self.assertEqual(denied.status_code, 409, denied.text)
        with patch("app.api.identity.sms_ready", return_value=True):
            allowed = self.client.post(
                "/api/v1/auth/identities/unlink",
                headers=self.headers,
                json={"key": "password"},
            )
            self.assertEqual(allowed.status_code, 200, allowed.text)
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/login",
                json={"username": self.name, "password": "Binding-password-123"},
            ).status_code,
            401,
        )

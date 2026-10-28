import io, json, time, hashlib, hmac, unittest
from unittest.mock import AsyncMock, Mock, patch
from PIL import Image
from fastapi.testclient import TestClient
from test_accounts import app
from app.core.config import settings
from app.core.db import SessionLocal
from app.models.entities import TrainingNode


def upstream(data):
    response = Mock()
    response.json.return_value = data
    response.raise_for_status.return_value = None
    ctx = AsyncMock()
    ctx.__aenter__.return_value.post = AsyncMock(return_value=response)
    ctx.__aenter__.return_value.get = AsyncMock(return_value=response)
    return ctx


class Integrations(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.client.__enter__()
        result = self.client.post(
            "/api/v1/auth/register",
            json={
                "username": "int_" + str(time.time_ns()),
                "password": "integration-password",
            },
        )
        self.assertEqual(result.status_code, 200, result.text)
        self.csrf = result.json()["csrf"]
        self.user = result.json()["user"]["id"]
        self.headers = {"X-CSRF-Token": self.csrf}

    def tearDown(self):
        self.client.__exit__(None, None, None)

    def test_food(self):
        image = io.BytesIO()
        Image.new("RGB", (10, 10)).save(image, format="PNG")
        food = dict(
            title="Lunch",
            base_kcal=500,
            base_protein_g=40,
            base_carb_g=45,
            base_fat_g=15,
            sugar_warn=False,
            advice="estimate",
            tips=[],
        )
        with (
            patch.multiple(
                settings,
                ai_food_enabled=True,
                ai_gateway_api_key="not-real",
                ai_vision_model="test",
            ),
            patch(
                "app.api.food.httpx.AsyncClient",
                return_value=upstream(
                    {"choices": [{"message": {"content": json.dumps(food)}}]}
                ),
            ),
        ):
            r = self.client.post(
                "/api/v1/ai/food",
                headers=self.headers,
                files={"file": ("meal.png", image.getvalue())},
            )
            self.assertEqual(r.status_code, 422)
            r = self.client.post(
                "/api/v1/ai/food",
                headers=self.headers,
                data={"consent": "true"},
                files={"file": ("meal.png", image.getvalue())},
            )
            self.assertEqual(r.status_code, 200, r.text)
            self.assertEqual(r.json()["base_protein_g"], 40)
            r = self.client.post(
                "/api/v1/ai/food",
                headers=self.headers,
                data={"consent": "true"},
                files={"file": ("bad.png", b"bad")},
            )
            self.assertEqual(r.status_code, 422)

    def test_sms(self):
        with patch.multiple(
            settings,
            twilio_account_sid="test",
            twilio_auth_token="not-real",
            twilio_verify_service_sid="test",
        ):
            with patch(
                "app.api.identity.httpx.AsyncClient",
                return_value=upstream({"status": "pending"}),
            ):
                self.assertEqual(
                    self.client.post(
                        "/api/v1/auth/sms/login",
                        json={"phone": "+8613800000000", "code": "123456"},
                    ).status_code,
                    401,
                )
            with patch(
                "app.api.identity.httpx.AsyncClient",
                return_value=upstream({"status": "approved"}),
            ):
                r = self.client.post(
                    "/api/v1/auth/sms/login",
                    json={"phone": "+8613800000000", "code": "123456"},
                )
                self.assertEqual(r.status_code, 200, r.text)

    def test_wechat(self):
        from urllib.parse import urlsplit, parse_qs

        with patch.multiple(
            settings,
            public_origin="https://example.test",
            wx_web_app_id="test",
            wx_web_app_secret="not-real",
        ):
            self.assertEqual(
                self.client.get(
                    "/api/v1/auth/wechat/callback?code=x&state=wrong"
                ).status_code,
                400,
            )
            r = self.client.get("/api/v1/auth/wechat/start")
            self.assertEqual(r.status_code, 200, r.text)
            state = parse_qs(urlsplit(r.json()["url"]).query)["state"][0]
            with patch(
                "app.api.identity.httpx.AsyncClient",
                return_value=upstream({"openid": "test-openid"}),
            ):
                r = self.client.get(
                    "/api/v1/auth/wechat/callback",
                    params={"code": "test", "state": state},
                    follow_redirects=False,
                )
                self.assertEqual(r.status_code, 303, r.text)
                self.assertEqual(
                    self.client.get(
                        "/api/v1/auth/wechat/callback",
                        params={"code": "test", "state": state},
                    ).status_code,
                    400,
                )

    def test_payment(self):
        seller = TestClient(app)
        r = seller.post(
            "/api/v1/auth/register",
            json={
                "username": "seller_" + str(time.time_ns()),
                "password": "seller-password-123",
            },
        )
        self.assertEqual(r.status_code, 200, r.text)
        listing = seller.post(
            "/api/v1/market/listings",
            headers={"X-CSRF-Token": r.json()["csrf"]},
            json={
                "kind": "plan",
                "title": "Test",
                "level": "入门",
                "price_fen": 100,
                "cycle": "week",
                "days": [
                    {
                        "day_type": "push",
                        "exercises": [{"name": "pushup", "sets": 3, "reps": "5"}],
                    }
                ],
            },
        )
        self.assertEqual(listing.status_code, 200, listing.text)
        secret = "test-webhook-secret"
        with patch.multiple(
            settings,
            stripe_secret_key="not-real",
            stripe_webhook_secret=secret,
            public_origin="https://example.test",
        ):
            with patch(
                "app.api.payments.httpx.AsyncClient",
                return_value=upstream(
                    {"id": "cs_test", "url": "https://checkout.stripe.com/test"}
                ),
            ):
                r = self.client.post(
                    "/api/v1/payments/checkout/" + str(listing.json()["listing_id"]),
                    headers=self.headers,
                    json={"ack_weight": True, "ack_level": True},
                )
                self.assertEqual(r.status_code, 200, r.text)
            order = r.json()["order_id"]
            with SessionLocal() as db:
                self.assertEqual(
                    db.query(TrainingNode).filter_by(owner_id=self.user).count(), 0
                )
            event = {
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": "cs_test",
                        "metadata": {"order_id": order},
                        "currency": "cny",
                        "amount_total": 100,
                        "mode": "payment",
                        "payment_status": "paid",
                    }
                },
            }
            raw = json.dumps(event).encode()
            stamp = str(int(time.time()))
            sig = hmac.new(
                secret.encode(), stamp.encode() + b"." + raw, hashlib.sha256
            ).hexdigest()
            self.assertEqual(
                self.client.post(
                    "/api/v1/payments/stripe/webhook",
                    content=raw,
                    headers={"stripe-signature": "t=" + stamp + ",v1=wrong"},
                ).status_code,
                400,
            )
            for _ in range(2):
                r = self.client.post(
                    "/api/v1/payments/stripe/webhook",
                    content=raw,
                    headers={"stripe-signature": "t=" + stamp + ",v1=" + sig},
                )
                self.assertEqual(r.status_code, 200, r.text)
            with SessionLocal() as db:
                self.assertEqual(
                    db.query(TrainingNode).filter_by(owner_id=self.user).count(), 1
                )
        seller.close()

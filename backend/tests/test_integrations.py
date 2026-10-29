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

    def test_multiple_foods_contract_and_invalid_candidates(self):
        image = io.BytesIO()
        Image.new("RGB", (10, 10)).save(image, format="PNG")
        food = dict(
            title="Candidate",
            base_kcal=100,
            base_protein_g=10,
            base_carb_g=5,
            base_fat_g=3,
            sugar_warn=False,
            advice="estimate",
            tips=[],
        )
        with patch.multiple(
            settings,
            ai_food_enabled=True,
            ai_gateway_api_key="not-real",
            ai_vision_model="test",
        ):
            for foods, expected in [
                ([food, {**food, "title": "Second"}], 200),
                ([], 502),
                ([{**food, "base_protein_g": -1}], 502),
            ]:
                with patch(
                    "app.api.food.httpx.AsyncClient",
                    return_value=upstream(
                        {
                            "choices": [
                                {"message": {"content": json.dumps({"foods": foods})}}
                            ]
                        }
                    ),
                ):
                    r = self.client.post(
                        "/api/v1/ai/food",
                        headers=self.headers,
                        data={"mode": "multi", "consent": "true"},
                        files={"file": ("test.png", image.getvalue())},
                    )
                    self.assertEqual(r.status_code, expected, r.text)
                    if expected == 200:
                        self.assertEqual(len(r.json()["foods"]), 2)
                        self.assertIsNone(r.json()["confidence"])

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
                "id": "evt_checkout_" + str(self.user),
                "created": 100,
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": "cs_test",
                        "payment_intent": "pi_" + str(self.user),
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

            def send_fact(event_id, kind, created, facts):
                data = json.dumps(
                    {
                        "id": event_id + str(self.user),
                        "type": kind,
                        "created": created,
                        "data": {
                            "object": {
                                "payment_intent": "pi_" + str(self.user),
                                **facts,
                            }
                        },
                    }
                ).encode()
                signature = hmac.new(
                    secret.encode(), stamp.encode() + b"." + data, hashlib.sha256
                ).hexdigest()
                result = self.client.post(
                    "/api/v1/payments/stripe/webhook",
                    content=data,
                    headers={"stripe-signature": "t=" + stamp + ",v1=" + signature},
                )
                self.assertEqual(result.status_code, 200, result.text)

            send_fact(
                "refund_new",
                "charge.refunded",
                300,
                {"id": "ch_test", "currency": "cny", "amount_refunded": 100},
            )
            send_fact(
                "refund_old",
                "charge.refunded",
                200,
                {"id": "ch_test", "currency": "cny", "amount_refunded": 30},
            )
            send_fact(
                "refund_new",
                "charge.refunded",
                300,
                {"id": "ch_test", "currency": "cny", "amount_refunded": 100},
            )
            send_fact(
                "dispute_close",
                "charge.dispute.closed",
                500,
                {"id": "du_test", "currency": "cny", "status": "won"},
            )
            send_fact(
                "dispute_open",
                "charge.dispute.created",
                400,
                {"id": "du_test", "currency": "cny", "status": "needs_response"},
            )
            orders = self.client.get("/api/v1/payments/orders").json()["items"]
            self.assertEqual(orders[0]["refunded_fen"], 100)
            self.assertEqual(orders[0]["disputes"], ["won"])
            self.assertEqual(len(orders[0]["events"]), 5)
            self.assertEqual(seller.get("/api/v1/payments/orders").json()["items"], [])
            ledger = seller.get("/api/v1/payments/creator-ledger").json()
            self.assertEqual(ledger["recorded_creator_fen"], 85)
            self.assertFalse(ledger["payout_enabled"])
        seller.close()

    def test_training_photos_are_private_and_removed_with_record(self):
        from test_accounts import payload

        image = io.BytesIO()
        Image.new("RGB", (30, 20), color="green").save(image, format="PNG")
        uploaded = self.client.post(
            "/api/v1/photos",
            headers=self.headers,
            files={"file": ("photo.png", image.getvalue())},
        )
        self.assertEqual(uploaded.status_code, 200, uploaded.text)
        photo_id = uploaded.json()["id"]
        self.assertEqual(self.client.get("/api/v1/photos/" + photo_id).status_code, 200)
        usage = self.client.get("/api/v1/photos/usage").json()
        self.assertGreater(usage["used_bytes"], 0)
        self.assertEqual(usage["limit_bytes"], 100 * 1024 * 1024)
        outsider = TestClient(app)
        r = outsider.post(
            "/api/v1/auth/register",
            json={
                "username": "other_" + str(time.time_ns()),
                "password": "another-password-123",
            },
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(outsider.get("/api/v1/photos/" + photo_id).status_code, 404)
        self.assertEqual(outsider.get("/api/v1/photos/usage").json()["used_bytes"], 0)
        self.assertEqual(TestClient(app).get("/api/v1/photos/usage").status_code, 401)
        bad = self.client.post(
            "/api/v1/photos",
            headers=self.headers,
            files={"file": ("fake.png", b"not image")},
        )
        self.assertEqual(bad.status_code, 422)
        too_large = self.client.post(
            "/api/v1/photos",
            headers=self.headers,
            files={"file": ("large.png", b"0" * (8 * 1024 * 1024 + 1))},
        )
        self.assertEqual(too_large.status_code, 413)
        data = payload()
        data["logs"] = {
            "2026-10-26|1-am": [
                {
                    "id": "photo-log",
                    "name": "pushup",
                    "note": "steady progress",
                    "photos": [photo_id],
                }
            ]
        }
        r = self.client.put(
            "/api/v1/data", headers=self.headers, json={"revision": 0, "data": data}
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(
            self.client.get("/api/v1/data").json()["data"]["logs"]["2026-10-26|1-am"][
                0
            ]["note"],
            "steady progress",
        )
        data["logs"] = {}
        r = self.client.put(
            "/api/v1/data", headers=self.headers, json={"revision": 1, "data": data}
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(self.client.get("/api/v1/photos/" + photo_id).status_code, 404)
        self.assertEqual(
            self.client.get("/api/v1/photos/usage").json()["used_bytes"], 0
        )
        outsider.close()

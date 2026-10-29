import hashlib
import io
import time
import unittest
from datetime import UTC, datetime, timedelta
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

from fastapi.testclient import TestClient
from PIL import Image
from test_accounts import app, payload

from app.core.config import settings
from app.core.db import SessionLocal
from app.models.account import (
    Account,
    AccountToken,
    LoginAttempt,
    LoginSession,
    PaymentOrder,
    RecoveryEmail,
    TrainingPhoto,
    UserData,
)
from app.models.entities import MarketComment, MarketLike, MarketListing, User
from app.models.home import FeedComment, FeedLike, FeedPost, Follow
from app.services import mail


class AccountSecurityTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.client.__enter__()
        with SessionLocal() as db:
            db.query(LoginAttempt).delete()
            db.commit()
        self.username = "security_" + str(time.time_ns())
        self.password = "Original-password-123"
        response = self.client.post(
            "/api/v1/auth/register",
            json={"username": self.username, "password": self.password},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.user_id = response.json()["user"]["id"]
        self.headers = {"X-CSRF-Token": response.json()["csrf"]}

    def tearDown(self):
        self.client.__exit__(None, None, None)

    def login(self, password, client=None):
        return (client or self.client).post(
            "/api/v1/auth/login", json={"username": self.username, "password": password}
        )

    def mail_token(self, purpose, email="owner@example.test"):
        with (
            patch.object(mail, "ready", return_value=True),
            patch.object(mail, "send_account_link") as sender,
        ):
            if purpose == "verify_email":
                response = self.client.post(
                    "/api/v1/auth/recovery-email",
                    headers=self.headers,
                    json={"current_password": self.password, "email": email},
                )
            else:
                response = self.client.post(
                    "/api/v1/auth/password/forgot",
                    json={"username": self.username, "email": email},
                )
            self.assertEqual(response.status_code, 200, response.text)
            link = sender.call_args.args[1]
            self.assertNotIn("token", response.text)
            return parse_qs(urlsplit(link).fragment.split("?", 1)[1])["token"][0]

    def test_password_change_checks_current_csrf_and_revokes_every_session(self):
        other = TestClient(app)
        self.assertEqual(self.login(self.password, other).status_code, 200)
        body = {
            "current_password": self.password,
            "new_password": "Changed-password-123",
        }
        self.assertEqual(
            self.client.post("/api/v1/auth/password/change", json=body).status_code, 403
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/password/change",
                headers=self.headers,
                json={**body, "current_password": "incorrect"},
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/password/change",
                headers=self.headers,
                json={**body, "new_password": "short"},
            ).status_code,
            422,
        )
        response = self.client.post(
            "/api/v1/auth/password/change", headers=self.headers, json=body
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(other.get("/api/v1/auth/me").status_code, 401)
        self.assertEqual(self.client.get("/api/v1/auth/me").status_code, 401)
        self.assertEqual(self.login(self.password).status_code, 401)
        self.assertEqual(self.login(body["new_password"]).status_code, 200)
        other.close()

    def test_recovery_email_verification_reset_expiry_and_single_use(self):
        token = self.mail_token("verify_email")
        with SessionLocal() as db:
            self.assertIsNone(db.get(RecoveryEmail, self.user_id))
            row = db.get(AccountToken, hashlib.sha256(token.encode()).hexdigest())
            self.assertIsNotNone(row)
            self.assertNotIn(token, row.digest)
        response = self.client.post(
            "/api/v1/auth/recovery-email/verify", json={"token": token}
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/recovery-email/verify", json={"token": token}
            ).status_code,
            400,
        )
        reset = self.mail_token("reset_password")
        with SessionLocal() as db:
            row = db.get(AccountToken, hashlib.sha256(reset.encode()).hexdigest())
            row.expires_at = datetime.now(UTC).replace(tzinfo=None) - timedelta(
                seconds=1
            )
            db.commit()
        body = {"token": reset, "new_password": "Recovered-password-123"}
        self.assertEqual(
            self.client.post("/api/v1/auth/password/reset", json=body).status_code, 400
        )
        fresh = self.mail_token("reset_password")
        # Applying a reset token to email verification is rejected without consumption.
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/recovery-email/verify", json={"token": fresh}
            ).status_code,
            400,
        )
        body["token"] = fresh
        self.assertEqual(
            self.client.post("/api/v1/auth/password/reset", json=body).status_code, 200
        )
        self.assertEqual(
            self.client.post("/api/v1/auth/password/reset", json=body).status_code, 400
        )
        self.assertEqual(self.client.get("/api/v1/data").status_code, 401)
        self.assertEqual(self.login(self.password).status_code, 401)
        self.assertEqual(self.login(body["new_password"]).status_code, 200)

    def test_unconfigured_mail_and_uniform_forgot_responses(self):
        with patch.object(mail, "ready", return_value=False):
            response = self.client.post(
                "/api/v1/auth/password/forgot",
                json={"username": self.username, "email": "owner@example.test"},
            )
            self.assertEqual(response.status_code, 503)
        with SessionLocal() as db:
            db.add(RecoveryEmail(user_id=self.user_id, email="owner@example.test"))
            db.commit()
        with (
            patch.object(mail, "ready", return_value=True),
            patch.object(
                mail, "send_account_link", side_effect=OSError("provider secret")
            ),
        ):
            expected = self.client.post(
                "/api/v1/auth/password/forgot",
                json={"username": self.username, "email": "owner@example.test"},
            )
            unknown = self.client.post(
                "/api/v1/auth/password/forgot",
                json={"username": "missing_account", "email": "owner@example.test"},
            )
            wrong = self.client.post(
                "/api/v1/auth/password/forgot",
                json={"username": self.username, "email": "wrong@example.test"},
            )
            self.assertEqual(expected.status_code, 200)
            self.assertEqual(expected.json(), unknown.json())
            self.assertEqual(expected.json(), wrong.json())
            self.assertNotIn("provider secret", expected.text)
        with SessionLocal() as db:
            self.assertEqual(
                db.query(AccountToken).filter_by(user_id=self.user_id).count(), 0
            )

    def test_delete_clears_private_data_and_sessions_reserves_user_id(self):
        data = payload()
        data["protein"] = {"2026-10-26": {"1": 155}}
        saved = self.client.put(
            "/api/v1/data", headers=self.headers, json={"revision": 0, "data": data}
        )
        self.assertEqual(saved.status_code, 200, saved.text)
        image = io.BytesIO()
        Image.new("RGB", (20, 20)).save(image, format="PNG")
        uploaded = self.client.post(
            "/api/v1/photos",
            headers=self.headers,
            files={"file": ("training.png", image.getvalue())},
        )
        self.assertEqual(uploaded.status_code, 200)
        body = {"current_password": self.password, "confirmation": "注销我的账号"}
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/account/delete",
                headers=self.headers,
                json={**body, "confirmation": "wrong"},
            ).status_code,
            422,
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/account/delete",
                headers=self.headers,
                json={**body, "current_password": "wrong"},
            ).status_code,
            400,
        )
        response = self.client.post(
            "/api/v1/auth/account/delete", headers=self.headers, json=body
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.client.get("/api/v1/auth/me").status_code, 401)
        self.assertEqual(self.login(self.password).status_code, 401)
        with SessionLocal() as db:
            for model in (Account, LoginSession, UserData, TrainingPhoto):
                self.assertEqual(
                    db.query(model).filter_by(user_id=self.user_id).count(), 0
                )
            user = db.get(User, self.user_id)
            self.assertTrue(user.openid.startswith("deleted:"))
            self.assertEqual(user.nickname, "已注销用户")
            self.assertIsNone(user.body_kg)
        fresh = self.client.post(
            "/api/v1/auth/register",
            json={"username": self.username, "password": self.password},
        )
        self.assertNotEqual(fresh.json()["user"]["id"], self.user_id)
        ids = [
            p["user_id"]
            for p in self.client.get("/api/v1/home/discover").json()["items"]
        ]
        self.assertNotIn(self.user_id, ids)
        self.assertEqual(
            self.client.post(
                f"/api/v1/home/follows/{self.user_id}",
                headers={"X-CSRF-Token": fresh.json()["csrf"]},
            ).status_code,
            404,
        )

    def test_delete_refuses_listing_and_order_without_mutation(self):
        with SessionLocal() as db:
            listing = MarketListing(
                seller_id=self.user_id,
                kind="lesson",
                title="Owned work",
                level="入门",
                price_fen=100,
            )
            db.add(listing)
            db.commit()
            listing_id = listing.id
        body = {"current_password": self.password, "confirmation": "注销我的账号"}
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/account/delete", headers=self.headers, json=body
            ).status_code,
            409,
        )
        self.assertEqual(self.client.get("/api/v1/auth/me").status_code, 200)

        with SessionLocal() as db:
            # Another seller's listing and a pending checkout still block buyer deletion.
            seller = User(
                openid="test-seller:" + str(time.time_ns()), nickname="Seller"
            )
            db.add(seller)
            db.flush()
            db.get(MarketListing, listing_id).seller_id = seller.id
            db.add(
                PaymentOrder(
                    id="security-" + str(time.time_ns()),
                    user_id=self.user_id,
                    listing_id=listing_id,
                    amount=100,
                    snapshot="{}",
                )
            )
            db.commit()
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/account/delete", headers=self.headers, json=body
            ).status_code,
            409,
        )
        self.assertEqual(self.client.get("/api/v1/auth/me").status_code, 200)

    def test_delete_removes_social_references_preserves_others_and_counts(self):
        with SessionLocal() as db:
            other = User(
                openid="social:" + str(time.time_ns()), nickname="Keep this user"
            )
            db.add(other)
            db.flush()
            other_id = other.id
            own_post = FeedPost(
                user_id=self.user_id, week_id="2026-10-26", likes_count=1
            )
            other_post = FeedPost(user_id=other.id, week_id="2026-10-26", likes_count=1)
            listing = MarketListing(
                seller_id=other.id,
                kind="lesson",
                title="Keep this work",
                level="入门",
                price_fen=100,
                likes_count=1,
            )
            db.add_all([own_post, other_post, listing])
            db.flush()
            post_id, listing_id = other_post.id, listing.id
            db.add_all(
                [
                    FeedLike(post_id=other_post.id, user_id=self.user_id),
                    FeedLike(post_id=own_post.id, user_id=other.id),
                    FeedComment(
                        post_id=own_post.id,
                        user_id=other.id,
                        text="Reply to deleted post",
                    ),
                    FeedComment(
                        post_id=other_post.id,
                        user_id=self.user_id,
                        text="Delete my reply",
                    ),
                    MarketLike(listing_id=listing.id, user_id=self.user_id),
                    MarketComment(
                        listing_id=listing.id,
                        user_id=self.user_id,
                        text="Delete my comment",
                    ),
                    Follow(follower_id=other.id, followee_id=self.user_id),
                    Follow(follower_id=self.user_id, followee_id=other.id),
                ]
            )
            db.commit()
        result = self.client.post(
            "/api/v1/auth/account/delete",
            headers=self.headers,
            json={"current_password": self.password, "confirmation": "注销我的账号"},
        )
        self.assertEqual(result.status_code, 200, result.text)
        with SessionLocal() as db:
            self.assertEqual(db.get(User, other_id).nickname, "Keep this user")
            self.assertEqual(db.get(FeedPost, post_id).likes_count, 0)
            self.assertEqual(db.get(MarketListing, listing_id).likes_count, 0)
            self.assertEqual(
                db.query(FeedPost).filter_by(user_id=self.user_id).count(), 0
            )
            self.assertEqual(
                db.query(FeedLike).filter_by(user_id=self.user_id).count(), 0
            )
            self.assertEqual(
                db.query(FeedComment).filter_by(user_id=self.user_id).count(), 0
            )
            self.assertEqual(
                db.query(MarketComment).filter_by(user_id=self.user_id).count(), 0
            )
            self.assertEqual(
                db.query(Follow).filter(Follow.follower_id == self.user_id).count(), 0
            )

    def test_smtp_adapter_encrypts_and_does_not_expose_link_in_api(self):
        with (
            patch.multiple(
                settings,
                smtp_host="mail.example.test",
                smtp_port=465,
                smtp_sender="no-reply@example.test",
                smtp_username="service",
                smtp_password="secret",
                smtp_starttls=False,
            ),
            patch("app.services.mail.smtplib.SMTP_SSL") as smtp,
        ):
            mail.send_account_link(
                "owner@example.test",
                "https://example.test/#/?token=one-time",
                "reset_password",
            )
            smtp.assert_called_once()
            # SMTP context returns the same client in production.
            smtp.return_value.send_message.assert_called_once()
            message = smtp.return_value.send_message.call_args.args[0]
            self.assertEqual(message["To"], "owner@example.test")
            self.assertIn("15 分钟", message.get_content())

from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base


class Account(Base):
    __tablename__ = "accounts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    username: Mapped[str] = mapped_column(String(64), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)


class LoginSession(Base):
    __tablename__ = "login_sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    csrf: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime)


class UserData(Base):
    __tablename__ = "user_data"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    revision: Mapped[int] = mapped_column(Integer, default=0)
    payload: Mapped[str] = mapped_column(Text, default="{}")


class LoginAttempt(Base):
    __tablename__ = "login_attempts"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    count: Mapped[int] = mapped_column(Integer, default=0)
    window_start: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ExternalIdentity(Base):
    __tablename__ = "external_identities"
    subject: Mapped[str] = mapped_column(String(256), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)


class OAuthState(Base):
    __tablename__ = "oauth_states"
    digest: Mapped[str] = mapped_column(String(64), primary_key=True)
    kind: Mapped[str] = mapped_column(String(16))
    expires_at: Mapped[datetime] = mapped_column(DateTime)


class PaymentOrder(Base):
    __tablename__ = "payment_orders"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("market_listings.id"))
    amount: Mapped[int] = mapped_column(Integer)
    snapshot: Mapped[str] = mapped_column(Text)
    checkout_id: Mapped[str | None] = mapped_column(
        String(256), unique=True, nullable=True
    )
    status: Mapped[str] = mapped_column(String(32), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TrainingPhoto(Base):
    __tablename__ = "training_photos"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    content: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

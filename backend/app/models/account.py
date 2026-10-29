from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, LargeBinary, Boolean
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


class BadgeAward(Base):
    __tablename__ = "badge_awards"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    badge_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    earned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RecoveryEmail(Base):
    __tablename__ = "account_recovery_emails"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    email: Mapped[str] = mapped_column(String(254))


class NodePreference(Base):
    __tablename__ = "node_preferences"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    node_id: Mapped[int] = mapped_column(
        ForeignKey("training_nodes.id"), primary_key=True
    )
    favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    category: Mapped[str] = mapped_column(String(32), default="")


class DataMeta(Base):
    __tablename__ = "data_meta"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class ReminderSetting(Base):
    __tablename__ = "reminder_settings"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    payload: Mapped[str] = mapped_column(Text)


class WorkFavorite(Base):
    __tablename__ = "work_favorites"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("market_listings.id"), primary_key=True)


class RankPrivacy(Base):
    __tablename__='rank_privacy'
    user_id:Mapped[int]=mapped_column(ForeignKey('users.id'),primary_key=True)
    participate:Mapped[bool]=mapped_column(Boolean,default=True)
    show_weight:Mapped[bool]=mapped_column(Boolean,default=True)


class ReminderDelivery(Base):
    __tablename__ = "reminder_deliveries"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    day: Mapped[str] = mapped_column(String(10), primary_key=True)
    kind: Mapped[str] = mapped_column(String(16), primary_key=True)
    status: Mapped[str] = mapped_column(String(16), default="pending")


class AccountToken(Base):
    __tablename__ = "account_tokens"
    digest: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    purpose: Mapped[str] = mapped_column(String(24))
    email: Mapped[str] = mapped_column(String(254), default="")
    expires_at: Mapped[datetime] = mapped_column(DateTime)
class BadgeProfile(Base):
    __tablename__ = "badge_profiles"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    featured_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

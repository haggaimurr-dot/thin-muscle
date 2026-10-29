from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base


class PaymentReference(Base):
    __tablename__ = "payment_references"
    payment_intent: Mapped[str] = mapped_column(String(256), primary_key=True)
    order_id: Mapped[str] = mapped_column(ForeignKey("payment_orders.id"), unique=True)


class PaymentEvent(Base):
    __tablename__ = "payment_events"
    event_id: Mapped[str] = mapped_column(String(256), primary_key=True)
    kind: Mapped[str] = mapped_column(String(128))
    payment_intent: Mapped[str] = mapped_column(String(256), index=True)
    order_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    created: Mapped[int] = mapped_column(Integer)
    facts: Mapped[str] = mapped_column(Text)

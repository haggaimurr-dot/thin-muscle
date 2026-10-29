from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base


class UserFood(Base):
    __tablename__ = "user_foods"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(128))
    food_kind: Mapped[str] = mapped_column(String(64))
    energy: Mapped[float] = mapped_column(Float)
    energy_unit: Mapped[str] = mapped_column(String(8))
    basis_grams: Mapped[float] = mapped_column(Float)
    kcal: Mapped[float] = mapped_column(Float)
    protein: Mapped[float | None] = mapped_column(Float, nullable=True)
    carb: Mapped[float | None] = mapped_column(Float, nullable=True)
    fat: Mapped[float | None] = mapped_column(Float, nullable=True)
    note: Mapped[str] = mapped_column(Text, default="")
    visibility: Mapped[str] = mapped_column(String(16), default="private", index=True)
    status: Mapped[str] = mapped_column(String(16), default="draft", index=True)
    category: Mapped[str] = mapped_column(String(64), default="", index=True)
    classification_status: Mapped[str] = mapped_column(String(16), default="pending")
    classification_note: Mapped[str] = mapped_column(String(500), default="")
    has_image: Mapped[bool] = mapped_column(Boolean, default=False)
    image: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True, deferred=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

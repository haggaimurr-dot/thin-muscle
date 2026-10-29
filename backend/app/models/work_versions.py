from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base


class WorkVersion(Base):
    __tablename__ = "work_versions"
    listing_id: Mapped[int] = mapped_column(
        ForeignKey("market_listings.id"), primary_key=True
    )
    version: Mapped[int] = mapped_column(Integer, primary_key=True)
    payload: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WorkDraft(Base):
    __tablename__ = "work_drafts"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    draft_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    payload: Mapped[str] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AssemblyLineage(Base):
    __tablename__ = "assembly_lineage"
    plan_id: Mapped[int] = mapped_column(
        ForeignKey("assembled_plans.id"), primary_key=True
    )
    previous_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    restored_from_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

from sqlalchemy import ForeignKey, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base


class PublicProfile(Base):
    __tablename__ = "public_profiles"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    bio: Mapped[str] = mapped_column(String(300), default="")
    show_avatar: Mapped[bool] = mapped_column(Boolean, default=False)
    show_bio: Mapped[bool] = mapped_column(Boolean, default=False)

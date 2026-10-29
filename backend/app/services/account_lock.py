from fastapi import HTTPException
from sqlalchemy import update

from app.models.entities import User


def lock_account(user, db):
    # A row update serializes concurrent identity removal/deletion, also on SQLite.
    db.execute(update(User).where(User.id == user.id).values(level=User.level))
    db.refresh(user)
    if user.openid.startswith("deleted:"):
        raise HTTPException(401, "账号不可用")

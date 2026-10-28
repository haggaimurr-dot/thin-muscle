import json
import re
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.api.auth import current_user
from app.core.db import get_db
from app.models.account import UserData, TrainingPhoto
from app.models.entities import User
from app.models.home import WeekStat

router = APIRouter(prefix="/data", tags=["data"])
FIELDS = {
    "phase": int,
    "logs": dict,
    "done": dict,
    "protein": dict,
    "hits": dict,
    "checks": dict,
    "videos": dict,
    "meals": list,
    "ai": list,
    "plans": dict,
}


class SaveData(BaseModel):
    revision: int = Field(ge=0)
    data: dict


def validate(data):
    if set(data) != set(FIELDS):
        raise HTTPException(422, "记录字段不完整")
    if any(type(data[k]) is not t for k, t in FIELDS.items()) or data["phase"] not in (
        1,
        2,
        3,
        4,
    ):
        raise HTTPException(422, "记录格式错误")
    if any(
        not isinstance(v, list)
        or any(not isinstance(e, dict) or not isinstance(e.get("name"), str) for e in v)
        for v in data["logs"].values()
    ):
        raise HTTPException(422, "训练记录格式错误")
    for entries in data["logs"].values():
        for entry in entries:
            if (
                not isinstance(entry.get("note", ""), str)
                or len(entry.get("note", "")) > 2000
            ):
                raise HTTPException(422, "训练心得不能超过 2000 字")
            photos = entry.get("photos", [])
            if (
                not isinstance(photos, list)
                or len(photos) > 3
                or any(not isinstance(photo, str) for photo in photos)
            ):
                raise HTTPException(422, "每条记录最多三张图片")
    try:
        text = json.dumps(data, ensure_ascii=False, allow_nan=False)
    except (ValueError, TypeError):
        raise HTTPException(422, "记录包含无效数值")
    if len(text.encode()) > 2 * 1024 * 1024:
        raise HTTPException(413, "记录超过 2MB，请导出归档后整理记录")
    for field in ("done", "protein", "hits", "checks", "plans"):
        if any(not isinstance(v, dict) for v in data[field].values()):
            raise HTTPException(422, "每周记录格式错误")
    if any(
        type(v) not in (int, float) or v < 0 or v > 10000
        for days in data["protein"].values()
        for v in days.values()
    ):
        raise HTTPException(422, "蛋白摄入记录格式错误")
    return text


@router.get("")
def read_data(user: User = Depends(current_user), db: Session = Depends(get_db)):
    row = db.get(UserData, user.id)
    return {
        "revision": row.revision if row else 0,
        "data": json.loads(row.payload) if row else None,
    }


@router.put("")
def save_data(
    body: SaveData, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    payload = validate(body.data)
    before = db.get(UserData, user.id)
    old_payload = json.loads(before.payload) if before else {}
    if body.revision == 0 and before:
        raise HTTPException(409, "其他设备已更新记录，请先备份本地记录再重新加载云端")
    if body.revision == 0:
        try:
            db.add(UserData(user_id=user.id, revision=1, payload=payload))
            db.flush()
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                409, "其他设备已更新记录，请先备份本地记录再重新加载云端"
            )
    else:
        result = db.execute(
            update(UserData)
            .where(UserData.user_id == user.id, UserData.revision == body.revision)
            .values(revision=body.revision + 1, payload=payload)
        )
        if result.rowcount != 1:
            db.rollback()
            raise HTTPException(
                409, "其他设备已更新记录，请先备份本地记录再重新加载云端"
            )
    removed = referenced_photos(old_payload) - referenced_photos(body.data)
    if removed:
        db.query(TrainingPhoto).filter(
            TrainingPhoto.user_id == user.id, TrainingPhoto.id.in_(removed)
        ).delete(synchronize_session=False)
    update_stats(user.id, body.data, db)
    db.commit()
    return {"revision": body.revision + 1}


def update_stats(user_id, data, db):
    weeks = (
        set(data["done"])
        | set(data["protein"])
        | {key.split("|")[0] for key in data["logs"]}
    )
    db.query(WeekStat).filter(WeekStat.user_id == user_id).delete()

    def number(value):
        match = re.match(r"^([0-9]+(?:\.[0-9]+)?)", str(value))
        return float(match.group(1)) if match else None

    def best(week):
        result = {}
        for key, entries in data["logs"].items():
            if not key.startswith(week + "|"):
                continue
            for entry in entries:
                load, reps = number(entry.get("weight")), number(entry.get("reps"))
                if load is None or reps is None:
                    continue
                value = (load, reps)
                name = entry["name"]
                if name not in result or value > result[name]:
                    result[name] = value
        return result

    for week in weeks:
        try:
            day = datetime.strptime(week, "%Y-%m-%d")
            if day.weekday() != 0:
                continue
        except ValueError:
            continue
        previous = (day - timedelta(days=7)).strftime("%Y-%m-%d")
        current, old = best(week), best(previous)
        improved = [
            name for name, value in current.items() if name in old and value > old[name]
        ]
        db.add(
            WeekStat(
                user_id=user_id,
                week_id=week,
                strength_done=sum(
                    data["done"].get(week, {}).get(str(d)) is True for d in (1, 3, 5)
                ),
                strength_total=3,
                protein_days=min(
                    7, sum(v >= 150 for v in data["protein"].get(week, {}).values())
                ),
                overload_count=len(improved),
                load_up_kg=round(
                    sum(max(0, current[n][0] - old[n][0]) for n in improved), 1
                ),
            )
        )


def referenced_photos(data):
    return {
        photo
        for entries in data.get("logs", {}).values()
        for entry in entries
        for photo in entry.get("photos", [])
        if isinstance(photo, str) and re.fullmatch(r"[a-f0-9]{32}", photo)
    }

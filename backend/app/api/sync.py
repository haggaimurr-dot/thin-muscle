import json
import re
import calendar
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.api.auth import current_user
from app.core.db import get_db
from app.models.account import UserData, TrainingPhoto, DataMeta
from datetime import UTC
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
    if set(data) - {"goals", "proteinTarget", "mealTemplates", "nutritionGoals"} != set(
        FIELDS
    ):
        raise HTTPException(422, "记录字段不完整")
    if any(type(data[k]) is not t for k, t in FIELDS.items()) or data["phase"] not in (
        1,
        2,
        3,
        4,
    ):
        raise HTTPException(422, "记录格式错误")
    nutrition_goals = data.get("nutritionGoals", {})
    if not isinstance(nutrition_goals, dict) or len(nutrition_goals) > 1500:
        raise HTTPException(422, "营养目标格式错误")
    for day, goal in nutrition_goals.items():
        try:
            if not re.fullmatch(r"20[0-9]{2}-[0-9]{2}-[0-9]{2}", day):
                raise ValueError()
            datetime.strptime(day, "%Y-%m-%d")
        except (ValueError, TypeError):
            raise HTTPException(422, "营养目标生效日期无效")
        limits = {"kcal": 20000, "protein": 1000, "carb": 3000, "fat": 2000}
        if (
            not isinstance(goal, dict)
            or set(goal) != set(limits)
            or any(
                type(goal[k]) is not int or not 1 <= goal[k] <= limit
                for k, limit in limits.items()
            )
        ):
            raise HTTPException(422, "营养目标须为范围内的正整数")
    target = data.get("proteinTarget", 150)
    if type(target) is not int or not 1 <= target <= 1000:
        raise HTTPException(422, "蛋白目标须为1–1000g整数")
    goals = data.get("goals", {})
    templates = data.get("mealTemplates", [])
    if not isinstance(templates, list) or len(templates) > 1000:
        raise HTTPException(422, "餐食模板格式错误或超过1000条")
    for meal in data["meals"] + templates:
        if not isinstance(meal, dict):
            raise HTTPException(422, "饮食记录格式错误")
        for field in (
            "base_kcal",
            "base_protein_g",
            "base_carb_g",
            "base_fat_g",
            "portion",
        ):
            if field in meal and (
                type(meal[field]) not in (int, float)
                or meal[field] < 0
                or (field == "portion" and meal[field] == 0)
            ):
                raise HTTPException(422, "饮食营养值须非负，份量须大于0")
    if not isinstance(goals, dict) or len(goals) > 1500:
        raise HTTPException(422, "个人目标格式错误")
    for period, goal in goals.items():
        if not re.fullmatch(r"20[0-9]{2}(?:-(?:0[1-9]|1[0-2]))?", period):
            raise HTTPException(422, "目标周期须为2000–2099年的年份或月份")
        year = int(period[:4])
        limit = (
            calendar.monthrange(year, int(period[5:]))[1]
            if len(period) == 7
            else (366 if calendar.isleap(year) else 365)
        )
        if (
            not isinstance(goal, dict)
            or set(goal) != {"strength_days", "protein_days"}
            or any(type(v) is not int or not 1 <= v <= limit for v in goal.values())
        ):
            raise HTTPException(422, "目标天数须为该周期内的正整数")
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
    for days in data["plans"].values():
        for day, plan in days.items():
            if str(day) not in {str(d) for d in range(1, 8)} or not isinstance(
                plan, dict
            ):
                raise HTTPException(422, "自定义计划日期格式错误")
            for session in ("am", "pm"):
                actions = plan.get(session)
                if not isinstance(actions, list) or len(actions) > 100:
                    raise HTTPException(422, "每时段最多100个动作")
                names = set()
                for action in actions:
                    if (
                        not isinstance(action, dict)
                        or not isinstance(action.get("name"), str)
                        or not action["name"].strip()
                        or len(action["name"]) > 128
                        or not str(action.get("sets", "")).strip()
                        or not str(action.get("reps", "")).strip()
                    ):
                        raise HTTPException(422, "计划动作须有名称、组数和次数")
                    if action["name"].strip() in names:
                        raise HTTPException(422, "同一时段动作名称不能重复")
                    names.add(action["name"].strip())
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
    meta = db.get(DataMeta, user.id)
    return {
        "revision": row.revision if row else 0,
        "data": json.loads(row.payload) if row else None,
        **({"updated_at": meta.updated_at.isoformat() + "Z"} if meta else {}),
    }


@router.put("")
def save_data(
    body: SaveData, user: User = Depends(current_user), db: Session = Depends(get_db)
):
    before = db.get(UserData, user.id)
    old_payload = json.loads(before.payload) if before else {}
    # Older clients omit goals; preserve saved goals rather than silently erase them.
    if "goals" not in body.data and "goals" in old_payload:
        body.data["goals"] = old_payload["goals"]
    if "proteinTarget" not in body.data and "proteinTarget" in old_payload:
        body.data["proteinTarget"] = old_payload["proteinTarget"]
    if "mealTemplates" not in body.data and "mealTemplates" in old_payload:
        body.data["mealTemplates"] = old_payload["mealTemplates"]
    if "nutritionGoals" not in body.data and "nutritionGoals" in old_payload:
        body.data["nutritionGoals"] = old_payload["nutritionGoals"]
    payload = validate(body.data)
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
    from app.services.badges import grant

    new_badges = grant(user.id, body.data, db)
    updated_at = datetime.now(UTC).replace(tzinfo=None)
    db.merge(DataMeta(user_id=user.id, updated_at=updated_at))
    db.commit()
    return {
        "revision": body.revision + 1,
        "new_badges": new_badges,
        "updated_at": updated_at.isoformat() + "Z",
    }


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

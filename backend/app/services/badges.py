import json
from pathlib import Path
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo
from app.models.account import BadgeAward

CATALOG = json.loads(
    (Path(__file__).resolve().parents[3] / "shared" / "badges.json").read_text()
)


def metrics(data, today=None):
    today = today or datetime.now(ZoneInfo("Asia/Shanghai")).date()
    strength, protein, journals = set(), set(), set()
    week_counts, rests = {}, set()

    def recorded_date(week, day):
        try:
            monday = date.fromisoformat(week)
            n = int(day)
            if (
                monday.isoformat() != week
                or monday.weekday() != 0
                or str(n) != str(day)
                or n not in range(1, 8)
            ):
                return None
            actual = monday + timedelta(days=n - 1)
            return actual if actual <= today else None
        except (ValueError, TypeError):
            return None

    for week, days in data.get("done", {}).items():
        if not isinstance(days, dict):
            continue
        for day, completed in days.items():
            actual = recorded_date(week, day)
            if completed is not True or not actual:
                continue
            if int(day) in (1, 3, 5):
                strength.add(actual)
                week_counts.setdefault(week, set()).add(int(day))
            else:
                rests.add(week)
    for week, days in data.get("protein", {}).items():
        if not isinstance(days, dict):
            continue
        for day, grams in days.items():
            actual = recorded_date(week, day)
            if actual and type(grams) in (int, float) and grams >= 150:
                protein.add(actual)
    for key, entries in data.get("logs", {}).items():
        try:
            week, session = key.split("|")
            day, half = session.split("-")
            actual = recorded_date(week, day)
        except (ValueError, TypeError):
            continue
        if not actual or half not in ("am", "pm") or not isinstance(entries, list):
            continue
        if any(
            isinstance(e, dict) and isinstance(e.get("note"), str) and e["note"].strip()
            for e in entries
        ):
            journals.add(actual)
    valid = sorted(
        date.fromisoformat(w) for w, days in week_counts.items() if len(days) >= 2
    )
    longest = run = 0
    previous = None
    for week in valid:
        run = run + 1 if previous and week - previous == timedelta(days=7) else 1
        previous = week
        longest = max(longest, run)
    return dict(
        strength_days=len(strength),
        protein_days=len(protein),
        journal_days=len(journals),
        valid_weeks=len(valid),
        longest_streak=longest,
        balanced_weeks=sum(w.isoformat() in rests for w in valid),
    )


def grant(user_id, data, db):
    stats = metrics(data)
    existing = {row.badge_id for row in db.query(BadgeAward).filter_by(user_id=user_id)}
    fresh = []
    for badge in CATALOG:
        if badge["id"] not in existing and stats[badge["metric"]] >= badge["target"]:
            db.add(BadgeAward(user_id=user_id, badge_id=badge["id"]))
            fresh.append(badge)
    return fresh


def weekly_goals(data, today=None):
    today = today or datetime.now(ZoneInfo("Asia/Shanghai")).date()
    monday = today - timedelta(days=today.weekday())
    week = monday.isoformat()
    current = {
        "done": {week: data.get("done", {}).get(week, {})},
        "protein": {week: data.get("protein", {}).get(week, {})},
        "logs": {
            key: entries
            for key, entries in data.get("logs", {}).items()
            if key.startswith(week + "|")
        },
    }
    stats = metrics(current, today=today)
    recovery = sum(
        current["done"][week].get(str(day)) is True
        and monday + timedelta(days=day - 1) <= today
        for day in (2, 4, 6, 7)
    )
    return {
        "week": week,
        "items": [
            {
                "id": "strength",
                "title": "规律力量训练",
                "description": "本周完成 2 个力量日，按计划循序渐进。",
                "current": stats["strength_days"],
                "target": 2,
                "unit": "天",
                "icon": "training",
                "action": "/training",
            },
            {
                "id": "recovery",
                "title": "给身体恢复时间",
                "description": "本周完成 1 个恢复日，散步或拉伸也算。",
                "current": recovery,
                "target": 1,
                "unit": "天",
                "icon": "leaf",
                "action": "/training?view=week",
            },
            {
                "id": "reflection",
                "title": "听听身体怎么说",
                "description": "本周至少一天为训练写下心得。",
                "current": stats["journal_days"],
                "target": 1,
                "unit": "天",
                "icon": "edit",
                "action": "/training?view=history",
            },
        ],
    }

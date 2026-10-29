import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.core.db import Base
from app.models.account import RankPrivacy
from app.models.entities import User
from app.models.home import WeekStat, Follow
from app.services.home import rank, monday_ymd, discover_users


class RankPrivacyTests(unittest.TestCase):
    def test_mutual_friends_privacy_and_hidden_weight(self):
        engine = create_engine("sqlite://")
        Base.metadata.create_all(engine)
        with Session(engine) as db:
            users = [
                User(openid="privacy:" + str(i), nickname=str(i), body_kg=65)
                for i in range(3)
            ]
            db.add_all(users)
            db.flush()
            for u, done in zip(users, [3, 2, 1]):
                db.add(
                    WeekStat(
                        user_id=u.id,
                        week_id=monday_ymd(),
                        strength_done=done,
                        strength_total=3,
                    )
                )
            a, b, c = users
            db.add_all(
                [
                    Follow(follower_id=a.id, followee_id=b.id),
                    Follow(follower_id=b.id, followee_id=a.id),
                    Follow(follower_id=a.id, followee_id=c.id),
                ]
            )
            db.commit()
            board = rank(db, a, "strength", scope="friends")
            self.assertEqual([u["user_id"] for u in board["full"]], [a.id, b.id])
            db.add_all(
                [
                    RankPrivacy(user_id=b.id, participate=False, show_weight=False),
                    RankPrivacy(user_id=a.id, participate=True, show_weight=False),
                ]
            )
            db.commit()
            public = rank(db, c, "strength")
            self.assertNotIn(b.id, [u["user_id"] for u in public["full"]])
            row = next(u for u in public["full"] if u["user_id"] == a.id)
            self.assertIsNone(row["body_kg"])
            self.assertEqual(row["body_band"], "未公开")
            self.assertNotIn("openid", row)
            people = discover_users(db, c)
            self.assertIsNone(
                next(u for u in people if u["user_id"] == b.id)["body_kg"]
            )
            self.assertNotIn(
                a.id, [u["user_id"] for u in rank(db, c, "weight_class")["full"]]
            )
        engine.dispose()

import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.core.db import Base
from app.models.entities import User
from app.models.home import FeedPost, Follow, WeekStat
from app.services.home import feed, _build_ranked_rows, monday_ymd, rank


class CommunityProgressTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.users = [
            User(openid="community:" + str(i), nickname=str(i)) for i in range(3)
        ]
        self.db.add_all(self.users)
        self.db.flush()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_cursor_pagination_is_stable_when_new_posts_arrive(self):
        a, b, _ = self.users
        self.db.add(Follow(follower_id=a.id, followee_id=b.id))
        posts = [FeedPost(user_id=b.id, week_id="2026-10-26") for _ in range(43)]
        self.db.add_all(posts)
        self.db.commit()
        first = feed(self.db, a, limit=20)
        self.db.add(FeedPost(user_id=b.id, week_id="2026-10-26"))
        self.db.commit()
        second = feed(self.db, a, before=first["next_cursor"], limit=20)
        third = feed(self.db, a, before=second["next_cursor"], limit=20)
        ids = [p["post_id"] for page in (first, second, third) for p in page["items"]]
        self.assertEqual(len(ids), 43)
        self.assertEqual(len(set(ids)), 43)
        self.assertIsNone(third["next_cursor"])

    def test_rank_ties_and_rules_describe_actual_rolling_period(self):
        for user, done in zip(self.users, [3, 3, 2]):
            self.db.add(
                WeekStat(
                    user_id=user.id,
                    week_id=monday_ymd(),
                    strength_done=done,
                    strength_total=3,
                )
            )
        self.db.commit()
        rows = _build_ranked_rows(self.db, "strength", "week")
        self.assertEqual([r["rank"] for r in rows], [1, 1, 3])
        result = rank(self.db, self.users[0], "strength", "month")
        self.assertIn("非自然月", result["period_rule"])
        self.assertIn("1、1、3", result["tie_rule"])
        self.assertEqual(len(result["rules"]), 5)

    def test_first_rank_request_never_fabricates_previous_hour(self):
        from app.models.home import RankSnapshot
        from app.services.home import hour_bucket, prev_hour_bucket

        current = hour_bucket()
        previous = prev_hour_bucket(current)
        self.assertFalse(
            self.db.query(RankSnapshot).filter_by(hour_bucket=previous).first()
        )
        result = rank(self.db, self.users[0], "strength", "week")
        self.assertFalse(
            self.db.query(RankSnapshot).filter_by(hour_bucket=previous).first()
        )
        self.assertEqual(result["compare_hint"], "暂无上一小时实际快照")

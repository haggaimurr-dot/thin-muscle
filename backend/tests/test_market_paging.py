import time
import unittest
from datetime import datetime
from fastapi.testclient import TestClient
from test_accounts import app
from app.core.db import SessionLocal
from app.models.entities import MarketListing, User


class MarketPagingTests(unittest.TestCase):
    def test_sorted_cursors_no_duplicates_and_filter_mismatch(self):
        with TestClient(app) as client:
            prefix = "Paging_" + str(time.time_ns())
            with SessionLocal() as db:
                user = User(openid=prefix, nickname="Paging seller")
                db.add(user)
                db.flush()
                for i in range(42):
                    db.add(
                        MarketListing(
                            seller_id=user.id,
                            kind="lesson",
                            title=prefix + str(i),
                            level="入门",
                            price_fen=(i % 5 + 1) * 100,
                            likes_count=i % 3,
                            created_at=datetime(2020, 1, 1),
                        )
                    )
                db.commit()
            for sort in ("newest", "price_asc", "price_desc", "popular"):
                cursor, seen, values = None, [], []
                for _ in range(10):
                    params = {"q": prefix, "sort": sort, "limit": 7}
                    if cursor:
                        params["cursor"] = cursor
                    r = client.get("/api/v1/market/listings", params=params)
                    self.assertEqual(r.status_code, 200, r.text)
                    result = r.json()
                    seen += [v["listing_id"] for v in result["items"]]
                    values += [v["price_fen"] for v in result["items"]]
                    cursor = result.get("next_cursor")
                    if cursor:
                        self.assertEqual(
                            client.get(
                                "/api/v1/market/listings",
                                params={**params, "q": "different", "cursor": cursor},
                            ).status_code,
                            422,
                        )
                    else:
                        break
                self.assertEqual(len(seen), 42)
                self.assertEqual(len(set(seen)), 42)
                if sort.startswith("price"):
                    self.assertEqual(
                        values, sorted(values, reverse=sort.endswith("desc"))
                    )

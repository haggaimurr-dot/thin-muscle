import time
import unittest
from fastapi.testclient import TestClient
from test_accounts import app
from app.core.db import SessionLocal
from app.models.account import LoginAttempt
from app.models.entities import User
from app.schemas.market import ListingCreate, ReplicateRequest
from app.services.market import purchase, node_out


class WorkVersionsTests(unittest.TestCase):
    def test_drafts_owner_versions_old_replica_and_unlisting(self):
        with TestClient(app) as a, TestClient(app) as b:
            with SessionLocal() as db:
                db.query(LoginAttempt).delete()
                db.commit()
            ids = []
            for client in (a, b):
                r = client.post(
                    "/api/v1/auth/register",
                    json={
                        "username": "work_" + str(time.time_ns()),
                        "password": "Work-Password-123",
                    },
                )
                self.assertEqual(r.status_code, 200, r.text)
                client.headers["X-CSRF-Token"] = r.json()["csrf"]
                ids.append(r.json()["user"]["id"])
            self.assertEqual(
                a.put(
                    "/api/v1/market/drafts/d1",
                    json={"data": {"form": {"title": "Private"}}},
                ).status_code,
                200,
            )
            self.assertEqual(b.get("/api/v1/market/drafts").json()["items"], [])
            body = ListingCreate(
                kind="lesson",
                title="Version one",
                level="入门",
                price_fen=100,
                topic="push",
                demo_media=[{"type": "video", "url": "https://example.com/a.mp4"}],
            ).model_dump()
            r = a.post("/api/v1/market/listings", json=body)
            self.assertEqual(r.status_code, 200, r.text)
            lid = r.json()["listing_id"]
            path = f"/api/v1/market/listings/{lid}"
            with SessionLocal() as db:
                from app.models.entities import MarketListing

                _, node = purchase(
                    db,
                    db.get(MarketListing, lid),
                    db.get(User, ids[1]),
                    ReplicateRequest(ack_weight=True, ack_level=True),
                )
                node_id = node.id
                self.assertEqual(node_out(node)["source_version"], 1)
            content = {**body, "title": "Version two"}
            self.assertEqual(
                b.put(
                    path + "/content", json={"expected_version": 1, "content": content}
                ).status_code,
                404,
            )
            r = a.put(
                path + "/content", json={"expected_version": 1, "content": content}
            )
            self.assertEqual(r.status_code, 200, r.text)
            self.assertEqual(r.json()["version"], 2)
            self.assertEqual(
                a.put(
                    path + "/content", json={"expected_version": 1, "content": body}
                ).status_code,
                409,
            )
            versions = a.get(path + "/versions").json()["items"]
            self.assertEqual(
                [v["content"]["title"] for v in versions],
                ["Version two", "Version one"],
            )
            self.assertEqual(b.get(path + "/versions").status_code, 404)
            a.post(path + "/status", json={"status": "unlisted"})
            self.assertFalse(
                any(
                    v["listing_id"] == lid
                    for v in b.get("/api/v1/market/listings").json()["items"]
                )
            )
            self.assertEqual(
                b.get(path).status_code, 200
            )  # existing buyer can still inspect
            nodes = b.get("/api/v1/market/nodes").json()["items"]
            copied = next(n for n in nodes if n["node_id"] == node_id)
            self.assertEqual(
                (copied["title"], copied["source_version"]), ("Version one", 1)
            )
            self.assertEqual(
                a.get("/api/v1/market/mine").json()["items"][0]["status"], "unlisted"
            )
            a.post(path + "/status", json={"status": "listed"})
            self.assertEqual(a.get(path).json()["version"], 2)

            pref_path = f"/api/v1/market/nodes/{node_id}/preferences"
            self.assertEqual(
                a.post(
                    pref_path, json={"favorite": True, "category": "Private"}
                ).status_code,
                404,
            )
            self.assertEqual(
                b.post(
                    pref_path, json={"favorite": True, "category": "Private"}
                ).status_code,
                200,
            )
            self.assertEqual(
                len(
                    b.get(
                        "/api/v1/market/node-library?favorite_only=true&category=Private&limit=1"
                    ).json()["items"]
                ),
                1,
            )
            self.assertEqual(
                a.get(
                    "/api/v1/market/node-library?favorite_only=true&category=Private"
                ).json()["items"],
                [],
            )
            self.assertEqual(
                b.get("/api/v1/market/node-library?q=no-match").json()["items"], []
            )

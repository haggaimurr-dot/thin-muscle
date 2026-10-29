import unittest

import httpx
from fastapi.testclient import TestClient

from test_accounts import app
from app.api import videos


def mock_client():
    def handler(request):
        if request.url.host == "b23.tv" and request.url.path == "/z2uK2Fb":
            return httpx.Response(
                302, headers={"location": "https://m.bilibili.com/video/BV1GJ411x7h7"}
            )
        if request.url.host == "b23.tv":
            return httpx.Response(302, headers={"location": "https://b23.tv/loop"})
        return httpx.Response(404)

    return httpx.Client(transport=httpx.MockTransport(handler), follow_redirects=False)


class VideoResolveTests(unittest.TestCase):
    def test_extract_bvid(self):
        self.assertEqual(
            videos.extract_bvid("https://www.bilibili.com/video/BV1GJ411x7h7"),
            "BV1GJ411x7h7",
        )
        self.assertEqual(
            videos.extract_bvid("https://m.bilibili.com/video/BV1GJ411x7h7?x=1"),
            "BV1GJ411x7h7",
        )
        self.assertEqual(videos.extract_bvid("https://b23.tv/z2uK2Fb"), "")
        self.assertEqual(videos.extract_bvid("not a url"), "")

    def test_resolve_b23_short_link(self):
        self.assertEqual(
            videos.resolve_b23("https://b23.tv/z2uK2Fb", mock_client()), "BV1GJ411x7h7"
        )

    def test_resolve_b23_rejects_redirect_loop(self):
        self.assertEqual(videos.resolve_b23("https://b23.tv/other", mock_client()), "")

    def test_endpoint(self):
        with TestClient(app) as client:
            reg = client.post(
                "/api/v1/auth/register",
                json={"username": "video_user", "password": "Password-test-123"},
            )
            self.assertEqual(reg.status_code, 200, reg.text)
            headers = {"X-CSRF-Token": reg.json()["csrf"]}

            ok = client.post(
                "/api/v1/videos/resolve",
                json={"url": "https://www.bilibili.com/video/BV1GJ411x7h7"},
                headers=headers,
            )
            self.assertEqual(ok.status_code, 200, ok.text)
            self.assertEqual(ok.json()["bvid"], "BV1GJ411x7h7")
            self.assertTrue(ok.json()["url"].endswith("/video/BV1GJ411x7h7"))

            bad = client.post(
                "/api/v1/videos/resolve",
                json={"url": "https://example.com/evil"},
                headers=headers,
            )
            self.assertEqual(bad.status_code, 422)

            bad_scheme = client.post(
                "/api/v1/videos/resolve",
                json={"url": "javascript:alert(1)"},
                headers=headers,
            )
            self.assertEqual(bad_scheme.status_code, 422)

    def test_endpoint_requires_auth(self):
        with TestClient(app) as client:
            denied = client.post(
                "/api/v1/videos/resolve",
                json={"url": "https://www.bilibili.com/video/BV1GJ411x7h7"},
            )
            self.assertEqual(denied.status_code, 401)


if __name__ == "__main__":
    unittest.main()

"""Bilibili video helpers.

POST /api/v1/videos/resolve accepts a bilibili.com video URL or a b23.tv
short link and returns the canonical {bvid, url}. Short links are resolved
server-side because browsers cannot follow the cross-origin redirect.

SSRF safety: only b23.tv is ever fetched, redirects are followed manually
(http/https only, max 5 hops), and every hop must stay on b23.tv or a
bilibili.com host.
"""

import re
from urllib.parse import urljoin, urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.models.entities import User

router = APIRouter(prefix="/videos", tags=["videos"])

BV_RE = re.compile(r"/video/(BV[A-Za-z0-9]{10})")
SHORT_HOSTS = {"b23.tv"}
BILI_HOSTS = {"www.bilibili.com", "bilibili.com", "m.bilibili.com"}
BILI_VIEW_API = "https://api.bilibili.com/x/web-interface/view"
BILI_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
MAX_HOPS = 5
REDIRECT_STATUS = (301, 302, 303, 307, 308)


class ResolveIn(BaseModel):
    url: str = Field(min_length=1, max_length=500)


def extract_bvid(url: str) -> str:
    match = BV_RE.search(urlparse(url).path or "")
    return match.group(1) if match else ""


def resolve_b23(url: str, client: httpx.Client) -> str:
    """Follow a b23.tv short link manually and return the BV id, or ''."""
    current = url
    for _ in range(MAX_HOPS):
        bvid = extract_bvid(current)
        if bvid:
            return bvid
        parsed = urlparse(current)
        if parsed.scheme not in ("http", "https"):
            return ""
        host = (parsed.hostname or "").lower()
        if host not in SHORT_HOSTS and host not in BILI_HOSTS:
            return ""
        try:
            resp = client.get(current)
        except httpx.HTTPError:
            return ""
        location = resp.headers.get("location")
        if resp.status_code in REDIRECT_STATUS and location:
            current = urljoin(current, location)
            continue
        # Landed on a page instead of redirecting: scan it for a BV id.
        match = BV_RE.search(resp.text or "")
        return match.group(1) if match else ""
    return extract_bvid(current)


def fetch_video_meta(bvid: str, client: httpx.Client) -> dict:
    """Return {aid, cid} from Bilibili's view API; {} on any failure."""
    try:
        resp = client.get(BILI_VIEW_API, params={"bvid": bvid})
        data = (resp.json() or {}).get("data") or {}
        aid, cid = data.get("aid"), data.get("cid")
        if aid and cid:
            return {"aid": aid, "cid": cid}
    except (httpx.HTTPError, ValueError):
        pass
    return {}


def embed_url(bvid: str, meta: dict) -> str:
    # Match Bilibili's official embed snippet (aid+bvid+cid+page).
    # bvid-only embeds rely on the player's own lookup, which fails for
    # some videos; passing cid lets the player start directly.
    if meta.get("aid") and meta.get("cid"):
        return (
            "https://player.bilibili.com/player.html"
            f"?aid={meta['aid']}&bvid={bvid}&cid={meta['cid']}&page=1"
        )
    return f"https://player.bilibili.com/player.html?bvid={bvid}&autoplay=0"


@router.post("/resolve")
def resolve_video(body: ResolveIn, user: User = Depends(get_current_user)):
    raw = body.url.strip()
    parsed = urlparse(raw)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise HTTPException(422, "只支持 HTTP/HTTPS 链接")
    host = parsed.hostname.lower()
    meta: dict = {}
    if host in BILI_HOSTS:
        bvid = extract_bvid(raw)
        if not bvid:
            raise HTTPException(422, "不是有效的 B站视频链接")
        meta = fetch_bvid_meta(bvid)
    elif host in SHORT_HOSTS:
        try:
            with httpx.Client(
                timeout=8.0,
                follow_redirects=False,
                trust_env=False,
                headers={"User-Agent": BILI_UA},
            ) as client:
                bvid = resolve_b23(raw, client)
                if bvid:
                    meta = fetch_video_meta(bvid, client)
        except httpx.HTTPError:
            raise HTTPException(502, "短链接解析失败，请稍后重试")
        if not bvid:
            raise HTTPException(422, "短链接未指向 B站视频，请确认链接有效")
    else:
        raise HTTPException(422, "只支持 B站视频链接或 b23.tv 短链接")
    return {
        "bvid": bvid,
        "url": f"https://www.bilibili.com/video/{bvid}",
        "aid": meta.get("aid"),
        "cid": meta.get("cid"),
        "embedUrl": embed_url(bvid, meta),
    }


def fetch_bvid_meta(bvid: str) -> dict:
    # Broad except: meta is best-effort enrichment; a failure must never
    # break resolving (e.g. broken proxy env in some runtimes).
    try:
        with httpx.Client(
            timeout=8.0, trust_env=False, headers={"User-Agent": BILI_UA}
        ) as client:
            return fetch_video_meta(bvid, client)
    except Exception:
        return {}

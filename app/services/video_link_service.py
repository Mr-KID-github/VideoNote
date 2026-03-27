"""
Helpers for building provider-specific video links.
"""
from __future__ import annotations

from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse


def format_timestamp_label(seconds: int) -> str:
    total_seconds = max(0, int(seconds))
    minutes = total_seconds // 60
    secs = total_seconds % 60
    return f"{minutes:02d}:{secs:02d}"


def build_video_jump_url(video_url: str, seconds: int) -> str:
    parsed = urlparse(video_url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query["t"] = str(max(0, int(seconds)))
    return urlunparse(parsed._replace(query=urlencode(query)))


def build_embed_url(video_url: str, seconds: int = 0) -> str | None:
    parsed = urlparse(video_url)
    hostname = (parsed.hostname or "").lower()
    offset = max(0, int(seconds))

    if "youtu.be" in hostname:
        video_id = parsed.path.strip("/")
        if not video_id:
            return None
        query = urlencode({"start": offset})
        return f"https://www.youtube.com/embed/{video_id}?{query}"

    if "youtube.com" in hostname:
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        video_id = query.get("v")
        if not video_id:
            return None
        embed_query = urlencode({"start": offset})
        return f"https://www.youtube.com/embed/{video_id}?{embed_query}"

    if "bilibili.com" in hostname or "b23.tv" in hostname:
        bvid = _extract_bilibili_bvid(parsed.path)
        if not bvid:
            return None
        embed_query = urlencode(
            {
                "bvid": bvid,
                "page": "1",
                "as_wide": "1",
                "high_quality": "1",
                "danmaku": "0",
                "t": str(offset),
            }
        )
        return f"https://player.bilibili.com/player.html?{embed_query}"

    return None


def _extract_bilibili_bvid(path: str) -> str | None:
    parts = [part for part in path.split("/") if part]
    for part in parts:
        if part.startswith("BV"):
            return part
    return None

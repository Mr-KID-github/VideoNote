"""
基于 yt-dlp 的通用下载器
支持 YouTube / Bilibili 以及 yt-dlp 支持的所有平台
"""
import logging
import os
import re
from typing import Optional
from urllib.parse import urlparse, parse_qs

import yt_dlp

from app.downloaders.base import Downloader
from app.models.audio import AudioDownloadResult

logger = logging.getLogger(__name__)


class YtdlpDownloader(Downloader):
    """
    通用 yt-dlp 下载器
    自动根据 URL 判断平台，无需为每个平台单独实现
    """

    # ---------- 平台检测映射 ----------

    PLATFORM_PATTERNS: dict[str, list[str]] = {
        "youtube": ["youtube.com", "youtu.be"],
        "bilibili": ["bilibili.com", "b23.tv"],
        "douyin": ["douyin.com"],
        "tiktok": ["tiktok.com"],
        "xiaohongshu": ["xiaohongshu.com", "xhslink.com"],
    }

    def detect_platform(self, video_url: str) -> str:
        """根据 URL 域名自动检测平台"""
        parsed = urlparse(video_url)
        host = parsed.hostname or ""
        for platform, domains in self.PLATFORM_PATTERNS.items():
            if any(d in host for d in domains):
                return platform
        return "unknown"

    def detect_video_id(self, video_url: str) -> Optional[str]:
        """从 URL 提取视频 ID"""
        parsed = urlparse(video_url)
        host = parsed.hostname or ""

        # YouTube
        if "youtube.com" in host:
            return parse_qs(parsed.query).get("v", [None])[0]
        if "youtu.be" in host:
            return parsed.path.strip("/")

        # Bilibili
        if "bilibili.com" in host:
            match = re.search(r"/(BV[\w]+)", parsed.path)
            return match.group(1) if match else None

        return None

    def download(self, video_url: str, output_dir: str) -> AudioDownloadResult:
        """
        下载音频并返回元数据

        使用 yt-dlp 提取最佳音频流，转为 mp3 格式
        """
        os.makedirs(output_dir, exist_ok=True)
        output_template = os.path.join(output_dir, "%(id)s.%(ext)s")

        platform = self.detect_platform(video_url)
        logger.info(f"[下载] 平台={platform}, URL={video_url}")

        ydl_opts = {
            "format": "bestaudio[ext=m4a]/bestaudio/best",
            "outtmpl": output_template,
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "64",
                }
            ],
            "noplaylist": True,
            "quiet": True,
            "no_warnings": True,
        }

        # Bilibili 需要特殊 header
        if platform == "bilibili":
            ydl_opts["http_headers"] = {
                "Referer": "https://www.bilibili.com/",
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
            }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)
            video_id = info.get("id", "unknown")
            title = info.get("title", "Untitled")
            duration = info.get("duration", 0)
            cover_url = info.get("thumbnail")
            audio_path = os.path.join(output_dir, f"{video_id}.mp3")

        logger.info(f"[下载完成] {title} ({duration:.0f}s) -> {audio_path}")

        return AudioDownloadResult(
            file_path=audio_path,
            title=title,
            duration=duration,
            video_id=video_id,
            platform=platform,
            cover_url=cover_url,
            raw_info=info,
        )

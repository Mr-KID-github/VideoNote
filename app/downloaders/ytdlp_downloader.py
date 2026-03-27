"""
Generic yt-dlp based downloader.
"""
from __future__ import annotations

import logging
import os
import re
import subprocess
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from urllib.parse import parse_qs, urlparse

import yt_dlp

from app.downloaders.base import Downloader
from app.models.audio import AudioDownloadResult

logger = logging.getLogger(__name__)


class YtdlpDownloader(Downloader):
    PLATFORM_PATTERNS: dict[str, list[str]] = {
        "youtube": ["youtube.com", "youtu.be"],
        "bilibili": ["bilibili.com", "b23.tv"],
        "douyin": ["douyin.com"],
        "tiktok": ["tiktok.com"],
        "xiaohongshu": ["xiaohongshu.com", "xhslink.com"],
    }

    def detect_platform(self, video_url: str) -> str:
        parsed = urlparse(video_url)
        host = parsed.hostname or ""
        for platform, domains in self.PLATFORM_PATTERNS.items():
            if any(domain in host for domain in domains):
                return platform
        return "unknown"

    def detect_video_id(self, video_url: str) -> Optional[str]:
        parsed = urlparse(video_url)
        host = parsed.hostname or ""

        if "youtube.com" in host:
            return parse_qs(parsed.query).get("v", [None])[0]
        if "youtu.be" in host:
            return parsed.path.strip("/")
        if "bilibili.com" in host:
            match = re.search(r"/(BV[\w]+)", parsed.path)
            return match.group(1) if match else None

        return None

    def download(self, video_url: str, output_dir: str) -> AudioDownloadResult:
        os.makedirs(output_dir, exist_ok=True)

        platform = self.detect_platform(video_url)
        logger.info("[Download] platform=%s url=%s", platform, video_url)

        info = self._extract_info(video_url, platform)
        video_id = info.get("id", "unknown")
        title = info.get("title", "Untitled")
        duration = info.get("duration", 0)
        cover_url = info.get("thumbnail")

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename_prefix = f"{timestamp}_{video_id}"
        output_template = os.path.join(output_dir, f"{filename_prefix}.%(ext)s")

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
        if platform == "bilibili":
            ydl_opts["http_headers"] = self._bilibili_headers()

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.extract_info(video_url, download=True)

        audio_path = os.path.join(output_dir, f"{filename_prefix}.mp3")
        logger.info("[Download] completed title=%s duration=%ss path=%s", title, duration, audio_path)

        return AudioDownloadResult(
            file_path=audio_path,
            title=title,
            duration=duration,
            video_id=video_id,
            platform=platform,
            cover_url=cover_url,
            raw_info=info,
        )

    def download_video(self, video_url: str, output_dir: str) -> str:
        os.makedirs(output_dir, exist_ok=True)

        platform = self.detect_platform(video_url)
        info = self._extract_info(video_url, platform)
        video_id = info.get("id", "unknown")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename_prefix = f"{timestamp}_{video_id}_video"

        cached = next(
            (
                path for path in Path(output_dir).glob(f"{filename_prefix}.*")
                if path.is_file() and path.suffix.lower() in {".mp4", ".mkv", ".webm", ".mov"}
            ),
            None,
        )
        if cached:
            logger.info("[Video] cache hit path=%s", cached)
            return str(cached)

        logger.info("[Video] downloading platform=%s url=%s", platform, video_url)

        ydl_opts = {
            "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best",
            "outtmpl": os.path.join(output_dir, f"{filename_prefix}.%(ext)s"),
            "noplaylist": True,
            "quiet": True,
            "no_warnings": True,
            "merge_output_format": "mp4",
        }
        if platform == "bilibili":
            ydl_opts["http_headers"] = self._bilibili_headers()
            ydl_opts["format"] = "bestvideo+bestaudio/best"

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.extract_info(video_url, download=True)

        candidates = sorted(
            (
                path for path in Path(output_dir).glob(f"{filename_prefix}.*")
                if path.is_file() and path.suffix.lower() in {".mp4", ".mkv", ".webm", ".mov"}
            ),
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        )
        if not candidates:
            raise FileNotFoundError(f"Downloaded video file was not found for prefix: {filename_prefix}")

        logger.info("[Video] completed path=%s", candidates[0])
        return str(candidates[0])

    def extract_frames(
        self,
        video_path: str,
        timestamps: List[float],
        output_dir: str,
        width: int = 1280,
    ) -> List[str]:
        os.makedirs(output_dir, exist_ok=True)
        video_id = Path(video_path).stem.replace("_video", "")
        frame_paths: list[str] = []

        for index, timestamp in enumerate(timestamps):
            minutes = int(timestamp // 60)
            seconds = int(timestamp % 60)
            time_str = f"00:{minutes:02d}:{seconds:02d}"
            output_path = os.path.join(output_dir, f"{video_id}_frame_{index + 1:02d}.jpg")

            cmd = [
                "ffmpeg",
                "-y",
                "-ss",
                time_str,
                "-i",
                video_path,
                "-vframes",
                "1",
                "-vf",
                f"scale={width}:-1",
                "-q:v",
                "2",
                output_path,
            ]

            try:
                subprocess.run(cmd, check=True, capture_output=True, timeout=30)
                if os.path.exists(output_path):
                    frame_paths.append(output_path)
                    logger.info("[Frame] extracted time=%s path=%s", time_str, output_path)
            except Exception as exc:
                logger.warning("[Frame] failed time=%s error=%s", time_str, exc)

        return frame_paths

    def _extract_info(self, video_url: str, platform: str) -> dict:
        ydl_opts_info = {
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
        }
        if platform == "bilibili":
            ydl_opts_info["http_headers"] = self._bilibili_headers()

        with yt_dlp.YoutubeDL(ydl_opts_info) as ydl:
            return ydl.extract_info(video_url, download=False)

    @staticmethod
    def _bilibili_headers() -> dict[str, str]:
        return {
            "Referer": "https://www.bilibili.com/",
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        }

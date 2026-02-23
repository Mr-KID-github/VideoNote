"""
基于 yt-dlp 的通用下载器
支持 YouTube / Bilibili 以及 yt-dlp 支持的所有平台
"""
import logging
import os
import re
import subprocess
from pathlib import Path
from typing import Optional, List
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

    def download_video(self, video_url: str, output_dir: str) -> str:
        """
        下载视频文件（用于截图）

        :param video_url: 视频链接
        :param output_dir: 输出目录
        :return: 视频文件路径
        """
        os.makedirs(output_dir, exist_ok=True)
        video_id = self.detect_video_id(video_url)
        video_path = os.path.join(output_dir, f"{video_id}_video.mp4")

        # 如果视频已存在，直接返回
        if os.path.exists(video_path):
            logger.info(f"[视频] 使用缓存: {video_path}")
            return video_path

        platform = self.detect_platform(video_url)
        logger.info(f"[视频下载] 平台={platform}, URL={video_url}")

        # 通用格式选项
        ydl_opts = {
            # 优先 mp4，没有就用其他格式
            "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best",
            "outtmpl": os.path.join(output_dir, f"{video_id}_video.%(ext)s"),
            "noplaylist": True,
            "quiet": True,
            "no_warnings": True,
            # 合并选项
            "merge_output_format": "mp4",
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
            # Bilibili 使用 dash 格式，需要特殊处理
            ydl_opts["format"] = "bestvideo+bestaudio/best"

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)
            ext = info.get("ext", "mp4")
            video_path = os.path.join(output_dir, f"{video_id}_video.{ext}")

        logger.info(f"[视频下载完成] -> {video_path}")
        return video_path

    def extract_frames(
        self,
        video_path: str,
        timestamps: List[float],
        output_dir: str,
        width: int = 1280,
    ) -> List[str]:
        """
        从视频中提取指定时间点的截图

        :param video_path: 视频文件路径
        :param timestamps: 时间点列表（秒）
        :param output_dir: 输出目录
        :param width: 截图宽度
        :return: 截图文件路径列表
        """
        os.makedirs(output_dir, exist_ok=True)
        video_id = Path(video_path).stem.replace("_video", "")
        frame_paths = []

        for i, timestamp in enumerate(timestamps):
            # 转换为 HH:MM:SS 格式
            minutes = int(timestamp // 60)
            seconds = int(timestamp % 60)
            time_str = f"00:{minutes:02d}:{seconds:02d}"

            output_path = os.path.join(output_dir, f"{video_id}_frame_{i+1:02d}.jpg")

            # 使用 ffmpeg 提取帧
            cmd = [
                "ffmpeg",
                "-y",  # 覆盖已存在的文件
                "-ss", time_str,
                "-i", video_path,
                "-vframes", "1",
                "-vf", f"scale={width}:-1",
                "-q:v", "2",  # 高质量
                output_path,
            ]

            try:
                subprocess.run(cmd, check=True, capture_output=True, timeout=30)
                if os.path.exists(output_path):
                    frame_paths.append(output_path)
                    logger.info(f"[截图] {time_str} -> {output_path}")
            except Exception as e:
                logger.warning(f"[截图失败] {time_str}: {e}")

        return frame_paths

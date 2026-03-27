"""
Screenshot placeholder processing for generated notes.
"""
import logging
import re
from pathlib import Path

from app.config import settings
from app.downloaders.base import Downloader
from app.services.video_link_service import build_video_jump_url, format_timestamp_label

logger = logging.getLogger(__name__)


class ScreenshotService:
    def __init__(self, downloader: Downloader):
        self.downloader = downloader

    def inject_screenshots(self, *, video_url: str, markdown: str, task_dir: Path, task_id: str) -> str:
        pattern = r"\[\[Screenshot:(\d{1,2}):(\d{2})\]\]"
        matches = re.findall(pattern, markdown)
        if not matches:
            return markdown

        timestamps = [int(minutes) * 60 + int(seconds) for minutes, seconds in matches]
        unique_timestamps = list(dict.fromkeys(timestamps))
        try:
            video_path = self.downloader.download_video(video_url=video_url, output_dir=str(settings.data_dir))
            frame_paths = self.downloader.extract_frames(
                video_path=video_path,
                timestamps=unique_timestamps,
                output_dir=str(task_dir / "screenshots"),
            )
            frame_by_timestamp = {
                seconds: frame_paths[index]
                for index, seconds in enumerate(unique_timestamps)
                if index < len(frame_paths)
            }
            for index, (minutes, seconds) in enumerate(matches):
                marker = f"[[Screenshot:{minutes}:{seconds}]]"
                timestamp = timestamps[index]
                frame_path = frame_by_timestamp.get(timestamp)
                if frame_path:
                    asset_path = f"/api/task/{task_id}/artifacts/screenshots/{Path(frame_path).name}"
                    label = format_timestamp_label(timestamp)
                    jump_url = build_video_jump_url(video_url, timestamp)
                    image_markdown = f"[![Screenshot {label}]({asset_path})]({jump_url})"
                    markdown = markdown.replace(marker, image_markdown)
                else:
                    markdown = markdown.replace(marker, "")
        except Exception as exc:
            logger.warning("[Screenshot] processing failed: %s", exc)
            markdown = re.sub(pattern, "", markdown)
        return markdown

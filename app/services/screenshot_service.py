"""
Screenshot placeholder processing for generated notes.
"""
import logging
import re
from pathlib import Path

from app.config import settings
from app.downloaders.base import Downloader

logger = logging.getLogger(__name__)


class ScreenshotService:
    def __init__(self, downloader: Downloader):
        self.downloader = downloader

    def inject_screenshots(self, *, video_url: str, markdown: str, task_dir: Path) -> str:
        pattern = r"\[\[Screenshot:(\d{1,2}):(\d{2})\]\]"
        matches = re.findall(pattern, markdown)
        if not matches:
            return markdown

        timestamps = [int(minutes) * 60 + int(seconds) for minutes, seconds in matches]
        try:
            video_path = self.downloader.download_video(video_url=video_url, output_dir=str(settings.data_dir))
            frame_paths = self.downloader.extract_frames(
                video_path=video_path,
                timestamps=timestamps,
                output_dir=str(task_dir / "screenshots"),
            )
            for index, (minutes, seconds) in enumerate(matches):
                marker = f"[[Screenshot:{minutes}:{seconds}]]"
                if index < len(frame_paths):
                    rel_path = f"screenshots/{Path(frame_paths[index]).name}"
                    markdown = markdown.replace(marker, f"![Screenshot {minutes}:{seconds}]({rel_path})")
                else:
                    markdown = markdown.replace(marker, "")
        except Exception as exc:
            logger.warning("[Screenshot] processing failed: %s", exc)
            markdown = re.sub(pattern, "", markdown)
        return markdown

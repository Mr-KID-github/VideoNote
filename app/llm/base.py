"""
LLM abstraction base class.
"""
from abc import ABC, abstractmethod
from typing import Callable, List

from app.models.transcript import TranscriptSegment

SummaryProgressCallback = Callable[[str], None]


class LLMSummarizer(ABC):
    """Base interface for transcript-to-note summarizers."""

    @abstractmethod
    def summarize(
        self,
        title: str,
        segments: List[TranscriptSegment],
        style: str = "detailed",
        summary_mode: str = "default",
        extras: str | None = None,
        output_language: str = "zh-CN",
        progress_callback: SummaryProgressCallback | None = None,
    ) -> str:
        """Convert transcript segments into structured Markdown notes."""
        ...

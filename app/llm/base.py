"""
LLM 抽象基类
"""
from abc import ABC, abstractmethod
from typing import List

from app.models.transcript import TranscriptSegment


class LLMSummarizer(ABC):
    """LLM 总结器基类"""

    @abstractmethod
    def summarize(
        self,
        title: str,
        segments: List[TranscriptSegment],
        style: str = "detailed",
        extras: str | None = None,
    ) -> str:
        """
        将转写结果总结为结构化 Markdown 笔记

        :param title: 视频标题
        :param segments: 转写分段
        :param style: 笔记风格
        :param extras: 额外提示词
        :return: Markdown 格式的笔记
        """
        ...

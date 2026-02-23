"""
转写器抽象基类
"""
from abc import ABC, abstractmethod

from app.models.transcript import TranscriptResult


class Transcriber(ABC):
    """音频转写器基类"""

    @abstractmethod
    def transcribe(self, file_path: str) -> TranscriptResult:
        """
        将音频文件转写为带时间戳的文本

        :param file_path: 音频文件路径
        :return: 转写结果（含分段时间戳）
        """
        ...

"""
基于 OpenAI Whisper 的音频转写器
"""
import logging
from typing import Optional

import whisper

from app.transcribers.base import Transcriber
from app.models.transcript import TranscriptResult, TranscriptSegment

logger = logging.getLogger(__name__)

# 全局单例缓存，避免重复加载模型
_model_cache: dict[str, whisper.Whisper] = {}


class WhisperTranscriber(Transcriber):
    """
    使用 OpenAI Whisper 进行本地音频转写

    支持模型大小: tiny / base / small / medium / large
    """

    def __init__(self, model_size: str = "base", device: str = "cpu"):
        self.model_size = model_size
        self.device = device
        self.model = self._load_model()

    def _load_model(self) -> whisper.Whisper:
        """加载 Whisper 模型（全局缓存）"""
        cache_key = f"{self.model_size}_{self.device}"
        if cache_key not in _model_cache:
            logger.info(f"[Whisper] 加载模型 {self.model_size} (device={self.device}) ...")
            _model_cache[cache_key] = whisper.load_model(self.model_size, device=self.device)
            logger.info(f"[Whisper] 模型加载完成")
        return _model_cache[cache_key]

    def transcribe(self, file_path: str) -> TranscriptResult:
        """
        转写音频文件

        :param file_path: 音频文件路径 (mp3/wav/m4a/...)
        :return: TranscriptResult 含完整文本 + 分段时间戳
        """
        logger.info(f"[Whisper] 开始转写: {file_path}")

        result = self.model.transcribe(
            file_path,
            verbose=False,
            fp16=False,  # CPU 模式下使用 fp32
        )

        language = result.get("language", "unknown")
        full_text = result.get("text", "").strip()

        segments = []
        for seg in result.get("segments", []):
            segments.append(
                TranscriptSegment(
                    start=round(seg["start"], 2),
                    end=round(seg["end"], 2),
                    text=seg["text"].strip(),
                )
            )

        logger.info(
            f"[Whisper] 转写完成: 语言={language}, 段数={len(segments)}, "
            f"总字数={len(full_text)}"
        )

        return TranscriptResult(
            language=language,
            full_text=full_text,
            segments=segments,
        )

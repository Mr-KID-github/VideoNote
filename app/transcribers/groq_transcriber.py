"""
基于 Groq API 的 Whisper 转写器
通过 Groq 的 whisper-large-v3-turbo 模型进行云端转写
零本地依赖，速度极快
"""
import logging
from pathlib import Path

from openai import OpenAI

from app.transcribers.base import Transcriber
from app.models.transcript import TranscriptResult, TranscriptSegment

logger = logging.getLogger(__name__)


class GroqWhisperTranscriber(Transcriber):
    """
    基于 Groq API 的 Whisper 转写器

    使用 Groq 提供的 whisper-large-v3-turbo 模型
    速度极快，无需本地 GPU，零原生依赖

    获取 API Key: https://console.groq.com/keys
    """

    def __init__(
        self,
        api_key: str,
        model: str = "whisper-large-v3-turbo",
        language: str | None = None,
    ):
        self.model = model
        self.language = language
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
        )
        logger.info(f"[GroqWhisper] 初始化完成: model={model}")

    def transcribe(self, file_path: str) -> TranscriptResult:
        """
        通过 Groq API 转写音频

        :param file_path: 音频文件路径
        :return: TranscriptResult
        """
        logger.info(f"[GroqWhisper] 开始转写: {file_path}")

        file_size = Path(file_path).stat().st_size / (1024 * 1024)
        logger.info(f"[GroqWhisper] 文件大小: {file_size:.1f} MB")

        with open(file_path, "rb") as audio_file:
            kwargs = {
                "model": self.model,
                "file": audio_file,
                "response_format": "verbose_json",
                "timestamp_granularities": ["segment"],
            }
            if self.language:
                kwargs["language"] = self.language

            response = self.client.audio.transcriptions.create(**kwargs)

        # 解析响应
        full_text = response.text.strip()
        language = getattr(response, "language", "unknown")

        segments = []
        for seg in getattr(response, "segments", []) or []:
            segments.append(
                TranscriptSegment(
                    start=round(seg.get("start", seg["start"]) if isinstance(seg, dict) else seg.start, 2),
                    end=round(seg.get("end", seg["end"]) if isinstance(seg, dict) else seg.end, 2),
                    text=(seg.get("text", "") if isinstance(seg, dict) else seg.text).strip(),
                )
            )

        logger.info(
            f"[GroqWhisper] 转写完成: 语言={language}, 段数={len(segments)}, "
            f"总字数={len(full_text)}"
        )

        return TranscriptResult(
            language=language,
            full_text=full_text,
            segments=segments,
        )

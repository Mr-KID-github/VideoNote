"""
基于 SenseVoice 的音频转写器
支持本地部署的 SenseVoice API 服务
"""
import logging
from pathlib import Path
from typing import Optional

import httpx

from app.transcribers.base import Transcriber
from app.models.transcript import TranscriptResult, TranscriptSegment

logger = logging.getLogger(__name__)


class SenseVoiceTranscriber(Transcriber):
    """
    使用 SenseVoice API 进行音频转写

    支持语言: auto / zh / en / yue / ja / ko
    """

    # 语言映射（将通用语言代码映射到 SenseVoice 支持的代码）
    LANGUAGE_MAP = {
        "chinese": "zh",
        "mandarin": "zh",
        "cantonese": "yue",
        "english": "en",
        "japanese": "ja",
        "korean": "ko",
        "auto": "auto",
    }

    def __init__(
        self,
        base_url: str = "http://localhost:50000",
        language: str = "auto",
        timeout: float = 300.0,
    ):
        """
        初始化 SenseVoice 转写器

        :param base_url: SenseVoice API 地址
        :param language: 语言 (auto/zh/en/yue/ja/ko)
        :param timeout: 请求超时时间（秒）
        """
        self.base_url = base_url.rstrip("/")
        self.language = self.LANGUAGE_MAP.get(language.lower(), language.lower())
        self.timeout = timeout
        logger.info(f"[SenseVoice] 初始化完成: base_url={base_url}, language={self.language}")

    def transcribe(self, file_path: str) -> TranscriptResult:
        """
        转写音频文件

        :param file_path: 音频文件路径 (mp3/wav/m4a/...)
        :return: TranscriptResult 含完整文本 + 分段时间戳
        """
        logger.info(f"[SenseVoice] 开始转写: {file_path}")

        audio_path = Path(file_path)
        if not audio_path.exists():
            raise FileNotFoundError(f"音频文件不存在: {file_path}")

        # 准备 multipart/form-data 请求
        url = f"{self.base_url}/api/v1/asr"

        with open(audio_path, "rb") as audio_file:
            files = {
                "files": (audio_path.name, audio_file, "audio/mpeg"),
            }
            data = {
                "lang": self.language,
                "keys": audio_path.stem,
            }

            try:
                with httpx.Client(timeout=self.timeout) as client:
                    response = client.post(url, files=files, data=data)
                    response.raise_for_status()
                    result = response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"[SenseVoice] API 请求失败: {e}")
                raise RuntimeError(f"SenseVoice API 错误: {e.response.text}")
            except httpx.RequestError as e:
                logger.error(f"[SenseVoice] 连接失败: {e}")
                raise RuntimeError(f"无法连接 SenseVoice 服务: {e}")

        # 解析结果
        # SenseVoice 返回格式: {"key1": "text1", "key2": "text2", ...}
        # 或者可能是其他格式，需要根据实际返回适配
        full_text = ""
        language = self.language

        if isinstance(result, dict):
            # 尝试获取转写文本
            # 格式可能是 {"filename": "transcribed text"}
            if len(result) > 0:
                # 取第一个值作为完整文本
                first_key = next(iter(result))
                full_text = result[first_key]

                # 如果返回的是带时间戳的格式
                if isinstance(full_text, dict):
                    # 可能是 {"text": "...", "segments": [...]}
                    language = full_text.get("language", language)
                    full_text = full_text.get("text", "")
                elif isinstance(full_text, str):
                    full_text = full_text.strip()
        elif isinstance(result, str):
            full_text = result.strip()
        elif isinstance(result, list) and len(result) > 0:
            # 如果返回的是列表
            first_item = result[0]
            if isinstance(first_item, dict):
                full_text = first_item.get("text", str(first_item))
            else:
                full_text = str(first_item)

        # SenseVoice 通常不返回时间戳，生成一个整体 segment
        segments = []
        if full_text:
            segments.append(
                TranscriptSegment(
                    start=0.0,
                    end=0.0,  # 未知时长
                    text=full_text,
                )
            )

        logger.info(
            f"[SenseVoice] 转写完成: 语言={language}, 总字数={len(full_text)}"
        )

        return TranscriptResult(
            language=language,
            full_text=full_text,
            segments=segments,
        )

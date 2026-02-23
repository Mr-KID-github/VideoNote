"""
基于 faster-whisper 的音频转写器
faster-whisper 使用 CTranslate2 引擎，比 openai-whisper 更快且内存占用更低
在 Windows 上更容易安装（无需 C++ 编译工具）
"""
import logging
from typing import Optional

from faster_whisper import WhisperModel

from app.transcribers.base import Transcriber
from app.models.transcript import TranscriptResult, TranscriptSegment

logger = logging.getLogger(__name__)

# 全局单例缓存，避免重复加载模型
_model_cache: dict[str, WhisperModel] = {}


class FasterWhisperTranscriber(Transcriber):
    """
    使用 faster-whisper 进行本地音频转写

    支持模型大小: tiny / base / small / medium / large-v2 / large-v3
    支持设备: cpu / cuda / auto
    """

    def __init__(
        self,
        model_size: str = "base",
        device: str = "cpu",
        compute_type: str = "int8",
        language: Optional[str] = None,
    ):
        """
        初始化 FasterWhisper 转写器

        :param model_size: 模型大小 (tiny/base/small/medium/large-v2/large-v3)
        :param device: 设备 (cpu/cuda/auto)
        :param compute_type: 计算精度 (int8/float16/float32)
                            - int8: 最快，内存占用最小（CPU 推荐）
                            - float16: 较快，需要 GPU
                            - float32: 最慢，精度最高
        :param language: 强制指定语言 (zh/en/...)，None 为自动检测
        """
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self.language = language
        self.model = self._load_model()

    def _load_model(self) -> WhisperModel:
        """加载 Whisper 模型（全局缓存）"""
        cache_key = f"{self.model_size}_{self.device}_{self.compute_type}"
        if cache_key not in _model_cache:
            logger.info(
                f"[FasterWhisper] 加载模型 {self.model_size} "
                f"(device={self.device}, compute_type={self.compute_type}) ..."
            )
            _model_cache[cache_key] = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type,
            )
            logger.info(f"[FasterWhisper] 模型加载完成")
        return _model_cache[cache_key]

    def transcribe(self, file_path: str) -> TranscriptResult:
        """
        转写音频文件

        :param file_path: 音频文件路径 (mp3/wav/m4a/...)
        :return: TranscriptResult 含完整文本 + 分段时间戳
        """
        logger.info(f"[FasterWhisper] 开始转写: {file_path}")

        # faster-whisper 的 transcribe 返回生成器
        segments_gen, info = self.model.transcribe(
            file_path,
            language=self.language,
            beam_size=5,
            vad_filter=True,  # 使用 VAD 过滤静音
        )

        # 收集所有 segments
        segments = []
        full_text_parts = []

        for seg in segments_gen:
            segments.append(
                TranscriptSegment(
                    start=round(seg.start, 2),
                    end=round(seg.end, 2),
                    text=seg.text.strip(),
                )
            )
            full_text_parts.append(seg.text.strip())

        full_text = " ".join(full_text_parts).strip()
        language = info.language if info.language else "unknown"

        logger.info(
            f"[FasterWhisper] 转写完成: 语言={language}, 段数={len(segments)}, "
            f"总字数={len(full_text)}"
        )

        return TranscriptResult(
            language=language,
            full_text=full_text,
            segments=segments,
        )

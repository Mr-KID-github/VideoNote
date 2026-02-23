"""
基于 SenseVoice (FunASR) 的本地音频转写器
直接使用 FunASR 库加载 SenseVoice 模型，无需单独部署 API 服务

安装依赖:
pip install funasr modelscope

支持 GPU 加速（需要 CUDA）
"""
import logging
import time
from pathlib import Path
from typing import Optional

from app.transcribers.base import Transcriber
from app.models.transcript import TranscriptResult, TranscriptSegment

logger = logging.getLogger(__name__)

# 全局单例缓存
_model_cache = {}


class SenseVoiceLocalTranscriber(Transcriber):
    """
    使用 FunASR SenseVoice 进行本地音频转写

    特点:
    - 中文识别效果优于 Whisper
    - 支持 GPU 加速
    - 支持热词（自定义词汇）
    - 延迟加载模型（首次调用时才加载）
    """

    # 语言代码映射
    LANGUAGE_MAP = {
        "auto": "zn",  # 自动检测（FunASR 默认中文）
        "zh": "zn",    # 中文
        "en": "en",    # 英文
        "yue": "zn",   # 粤语（暂作中文处理）
        "ja": "jp",    # 日语
        "ko": "ko",    # 韩语
    }

    def __init__(
        self,
        model_size: str = "small",
        device: str = "cpu",
        language: str = "auto",
        hotwords: Optional[str] = None,
        use_gpu: bool = False,
    ):
        """
        初始化 SenseVoice 本地转写器

        :param model_size: 模型大小 (small / large)
        :param device: 设备 (cpu / cuda)
        :param language: 语言 (auto / zh / en / ja)
        :param hotwords: 热词文件路径，提高特定词汇识别准确率
        :param use_gpu: 是否使用 GPU 加速
        """
        self.model_size = model_size
        self.device = "cuda" if use_gpu else "cpu"
        self.language = self.LANGUAGE_MAP.get(language.lower(), "zn")
        self.hotwords = hotwords
        self.use_gpu = use_gpu

        # 延迟加载：初始化时不加载模型
        self._model = None
        self._model_loaded = False

        # 模型名称（用于日志）
        if self.model_size == "large":
            self._model_name = "iic/SenseVoiceLarge"
        else:
            self._model_name = "iic/SenseVoiceSmall"

    @property
    def model(self):
        """延迟加载模型（首次访问时才加载）"""
        if self._model is None:
            self._model = self._load_model()
            self._model_loaded = True
        return self._model

    def _load_model(self):
        """加载 FunASR SenseVoice 模型（全局缓存 + 延迟加载）"""
        cache_key = f"{self.model_size}_{self.device}"

        if cache_key not in _model_cache:
            try:
                from funasr import AutoModel

                logger.info(
                    f"[SenseVoice] 检测到首次调用，开始加载本地语音模型 "
                    f"({self._model_name}, device={self.device})..."
                )

                start_time = time.time()

                _model_cache[cache_key] = AutoModel(
                    model=self._model_name,
                    device=self.device,
                    disable_pbar=True,
                    disable_log=True,
                )

                elapsed = time.time() - start_time
                logger.info(
                    f"[SenseVoice] 本地语音模型加载完成 (耗时 {elapsed:.1f} 秒)"
                )

            except ImportError as e:
                raise ImportError(
                    "请安装 FunASR: pip install funasr modelscope\n"
                    f"详细错误: {e}"
                )

        return _model_cache[cache_key]

    def transcribe(self, file_path: str) -> TranscriptResult:
        """
        转写音频文件

        :param file_path: 音频文件路径
        :return: TranscriptResult
        """
        audio_path = Path(file_path)
        if not audio_path.exists():
            raise FileNotFoundError(f"音频文件不存在: {file_path}")

        # 获取文件大小
        file_size_mb = audio_path.stat().st_size / (1024 * 1024)

        # 触发模型加载（如果还没加载）
        _ = self.model

        logger.info(
            f"[SenseVoice] 开始转录音频: {audio_path.name} ({file_size_mb:.1f} MB)"
        )

        start_time = time.time()

        try:
            # FunASR 自动处理音频格式转换
            result = self.model.generate(
                input=str(audio_path),
                language=self.language,
                batch_size_s=300,  # 每批处理 300 秒音频
                hotword=self.hotwords,
            )

            # 解析结果
            # FunASR 返回格式: [{'text': '...', 'timestamp': [[start, end], ...]}]
            full_text = ""
            segments = []
            language = "zh"  # 默认中文

            if result and len(result) > 0:
                first_result = result[0]

                # 获取完整文本
                full_text = first_result.get("text", "").strip()

                # 获取时间戳（如果有）
                timestamps = first_result.get("timestamp", [])
                if timestamps:
                    for ts in timestamps:
                        if len(ts) >= 2:
                            segments.append(
                                TranscriptSegment(
                                    start=round(ts[0] / 1000, 2),  # 毫秒转秒
                                    end=round(ts[1] / 1000, 2),
                                    text="",  # FunASR 时间戳是词级别的，文本需要额外处理
                                )
                            )

                # 如果没有时间戳，创建一个整体 segment
                if not segments and full_text:
                    segments.append(
                        TranscriptSegment(
                            start=0.0,
                            end=0.0,
                            text=full_text,
                        )
                    )

            elapsed = time.time() - start_time
            logger.info(
                f"[SenseVoice] 转录完成: 语言={language}, 总字数={len(full_text)} "
                f"(耗时 {elapsed:.1f} 秒)"
            )

            return TranscriptResult(
                language=language,
                full_text=full_text,
                segments=segments if segments else [TranscriptSegment(0.0, 0.0, full_text)],
            )

        except Exception as e:
            logger.error(f"[SenseVoice] 转录失败: {e}")
            raise RuntimeError(f"SenseVoice 转录失败: {e}")

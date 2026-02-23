"""
笔记生成核心 Pipeline
编排整个流程: 下载 → 转写 → LLM 总结 → 输出
"""
import json
import logging
from dataclasses import asdict
from pathlib import Path
from typing import Optional

from app.config import settings
from app.downloaders.base import Downloader
from app.downloaders.ytdlp_downloader import YtdlpDownloader
from app.llm.base import LLMSummarizer
from app.llm.openai_llm import OpenAILLM, AnthropicLLM
from app.models.audio import AudioDownloadResult
from app.models.note import NoteResult
from app.models.transcript import TranscriptResult, TranscriptSegment
from app.transcribers.base import Transcriber

logger = logging.getLogger(__name__)


def _create_transcriber() -> Transcriber:
    """根据配置创建转写器实例"""
    t_type = settings.transcriber_type.lower()

    if t_type == "groq":
        from app.transcribers.groq_transcriber import GroqWhisperTranscriber
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY 未配置，请在 .env 中设置")
        return GroqWhisperTranscriber(api_key=settings.groq_api_key)

    elif t_type == "whisper":
        from app.transcribers.whisper_transcriber import WhisperTranscriber
        return WhisperTranscriber(
            model_size=settings.whisper_model_size,
            device=settings.whisper_device,
        )

    elif t_type == "faster-whisper":
        from app.transcribers.faster_whisper_transcriber import FasterWhisperTranscriber
        return FasterWhisperTranscriber(
            model_size=settings.whisper_model_size,
            device=settings.whisper_device,
            compute_type=settings.faster_whisper_compute_type,
        )

    elif t_type == "sensevoice":
        from app.transcribers.sensevoice_transcriber import SenseVoiceTranscriber
        return SenseVoiceTranscriber(
            base_url=settings.sensevoice_base_url,
            language=settings.sensevoice_language,
        )

    elif t_type == "sensevoice-local":
        from app.transcribers.sensevoice_local_transcriber import SenseVoiceLocalTranscriber
        return SenseVoiceLocalTranscriber(
            model_size=settings.sensevoice_model_size,
            device="cuda" if settings.sensevoice_use_gpu else "cpu",
            language=settings.sensevoice_language,
            use_gpu=settings.sensevoice_use_gpu,
        )

    else:
        raise ValueError(f"不支持的转写器类型: {t_type}，可选: groq / whisper / faster-whisper / sensevoice / sensevoice-local")


class NoteService:
    """
    视频笔记生成服务

    Pipeline 流程:
    1. 下载视频音频轨 (yt-dlp)
    2. 转写音频为文本 (Groq Whisper API / 本地 Whisper)
    3. LLM 总结生成 Markdown (OpenAI 兼容 API)

    支持缓存: 已下载的音频和转写结果会被缓存，重复请求自动跳过
    """

    def __init__(self):
        self.downloader: Downloader = YtdlpDownloader()
        self.transcriber: Transcriber = _create_transcriber()
        logger.info(
            f"[NoteService] 初始化完成: "
            f"transcriber={settings.transcriber_type}, "
            f"llm={settings.llm_model}"
        )

    def _get_llm(
        self,
        model_name: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ) -> LLMSummarizer:
        """获取 LLM 实例（支持请求级别覆盖配置）

        根据 base_url 自动选择:
        - MiniMax Anthropic 兼容模式 -> AnthropicLLM
        - 其他 OpenAI 兼容 API -> OpenAILLM
        """
        api_key = api_key or settings.llm_api_key
        base_url = base_url or settings.llm_base_url
        model = model_name or settings.llm_model

        # 检测是否是 Anthropic 兼容模式 (MiniMax / 智谱 GLM)
        if "minimaxi.com/anthropic" in base_url or "open.bigmodel.cn/api/anthropic" in base_url:
            return AnthropicLLM(
                api_key=api_key,
                base_url=base_url,
                model=model,
            )

        return OpenAILLM(
            api_key=api_key,
            base_url=base_url,
            model=model,
        )

    # ==================== 核心 Pipeline ====================

    def _sanitize_filename(self, name: str) -> str:
        """清理文件名，移除非法字符"""
        import re
        # 移除或替换非法字符
        name = re.sub(r'[<>:"/\\|?*]', '', name)
        # 限制长度
        return name[:50] if len(name) > 50 else name

    def generate(
        self,
        video_url: str,
        task_id: str,
        platform: str = "auto",
        style: str = "detailed",
        extras: Optional[str] = None,
        model_name: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ) -> NoteResult:
        """
        主流程入口: 视频 URL → Markdown 笔记

        :param video_url: 视频链接
        :param task_id: 任务唯一 ID (UUID)
        :param platform: 平台 (auto 则智能检测)
        :param style: 笔记风格
        :param extras: 额外提示词
        :param model_name: 覆盖默认 LLM 模型名
        :param api_key: 覆盖默认 API Key
        :param base_url: 覆盖默认 Base URL
        :return: NoteResult
        """
        from datetime import datetime

        # 先创建临时目录
        temp_dir = settings.output_dir / task_id
        temp_dir.mkdir(parents=True, exist_ok=True)

        # final_dir 会在下载完成后设置为日期时间+标题
        final_dir: Path = temp_dir

        try:
            # ---- Step 1: 下载 ----
            self._update_status(temp_dir, "downloading", "正在下载视频音频...")

            audio_meta = self._step_download(
                video_url=video_url,
                cache_file=temp_dir / "audio_meta.json",
            )

            # ---- Step 1.5: 重命名目录为日期时间+标题 ----
            # 生成有意义的目录名: YYYYMMDD_HHMMSS_视频标题
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_title = self._sanitize_filename(audio_meta.title)
            new_dir_name = f"{timestamp}_{safe_title}"
            final_dir = settings.output_dir / new_dir_name

            # 如果同名目录已存在，添加序号
            counter = 1
            while final_dir.exists():
                final_dir = settings.output_dir / f"{new_dir_name}_{counter}"
                counter += 1

            # 重命名目录
            temp_dir.rename(final_dir)
            logger.info(f"[目录] 已重命名: {task_id} -> {new_dir_name}")

            # 保存 task_id 到新目录的映射
            (final_dir / ".task_id").write_text(task_id, encoding="utf-8")

            # ---- Step 2: 转写 ----
            self._update_status(final_dir, "transcribing", "正在转写音频...")

            transcript = self._step_transcribe(
                audio_path=audio_meta.file_path,
                cache_file=final_dir / "transcript.json",
                task_dir=final_dir,
            )

            # ---- Step 3: LLM 总结 ----
            self._update_status(final_dir, "summarizing", "正在生成笔记...")

            llm = self._get_llm(model_name, api_key, base_url)
            markdown = llm.summarize(
                title=audio_meta.title,
                segments=transcript.segments,
                style=style,
                extras=extras,
            )

            # ---- Step 4: 处理截图 ----
            self._update_status(final_dir, "screenshots", "正在处理截图...")
            markdown = self._process_screenshots(
                video_url=video_url,
                markdown=markdown,
                task_dir=final_dir,
            )

            # 缓存 Markdown
            (final_dir / "note.md").write_text(markdown, encoding="utf-8")

            # ---- Step 5: 保存最终结果 ----
            result = NoteResult(
                markdown=markdown,
                transcript=transcript,
                audio_meta=audio_meta,
            )
            self._save_result(final_dir, result)
            self._update_status(final_dir, "success", "笔记生成完成")

            logger.info(f"[Pipeline] 任务完成: task_id={task_id}, dir={new_dir_name}")
            return result

        except Exception as exc:
            logger.error(f"[Pipeline] 任务失败: task_id={task_id}, error={exc}", exc_info=True)
            if final_dir.exists():
                self._update_status(final_dir, "failed", str(exc))
            raise

    # ==================== Pipeline 子步骤 ====================

    def _step_download(
        self,
        video_url: str,
        cache_file: Path,
    ) -> AudioDownloadResult:
        """Step 1: 下载音频（带缓存）"""

        # 检查缓存
        if cache_file.exists():
            logger.info(f"[下载] 命中缓存: {cache_file}")
            try:
                data = json.loads(cache_file.read_text(encoding="utf-8"))
                return AudioDownloadResult(**data)
            except Exception as e:
                logger.warning(f"[下载] 缓存解析失败，重新下载: {e}")

        # 执行下载
        audio_meta = self.downloader.download(
            video_url=video_url,
            output_dir=str(settings.data_dir),
        )

        # 写入缓存
        cache_file.write_text(
            json.dumps(asdict(audio_meta), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return audio_meta

    def _step_transcribe(
        self,
        audio_path: str,
        cache_file: Path,
        task_dir: Optional[Path] = None,
    ) -> TranscriptResult:
        """Step 2: 转写音频（带缓存）

        :param audio_path: 音频文件路径
        :param cache_file: 缓存文件路径
        :param task_dir: 任务目录（用于状态更新）
        """

        # 检查缓存
        if cache_file.exists():
            logger.info(f"[转写] 命中缓存: {cache_file}")
            try:
                data = json.loads(cache_file.read_text(encoding="utf-8"))
                segments = [TranscriptSegment(**s) for s in data.get("segments", [])]
                return TranscriptResult(
                    language=data.get("language"),
                    full_text=data.get("full_text", ""),
                    segments=segments,
                )
            except Exception as e:
                logger.warning(f"[转写] 缓存解析失败，重新转写: {e}")

        # 检查是否为本地转录器（需要加载模型）
        transcriber_type = settings.transcriber_type.lower()
        is_local_transcriber = transcriber_type in ["whisper", "faster-whisper", "sensevoice-local"]

        if is_local_transcriber and task_dir:
            self._update_status(task_dir, "transcribing", "正在加载本地语音模型...")

        # 执行转写
        logger.info(f"[转写] 开始处理: {audio_path}")
        transcript = self.transcriber.transcribe(file_path=audio_path)

        if task_dir:
            self._update_status(task_dir, "transcribing", "转录完成，正在保存...")

        # 写入缓存
        cache_file.write_text(
            json.dumps(asdict(transcript), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return transcript

    def _process_screenshots(
        self,
        video_url: str,
        markdown: str,
        task_dir: Path,
    ) -> str:
        """处理笔记中的截图标记

        检测 [[Screenshot:MM:SS]] 标记，下载视频并提取截图，
        替换为 Markdown 图片链接
        """
        import re

        # 查找所有截图标记
        pattern = r"\[\[Screenshot:(\d{1,2}):(\d{2})\]\]"
        matches = re.findall(pattern, markdown)

        if not matches:
            logger.info("[截图] 没有发现截图标记")
            return markdown

        # 解析时间戳
        timestamps = []
        for minutes, seconds in matches:
            ts = int(minutes) * 60 + int(seconds)
            timestamps.append(ts)

        logger.info(f"[截图] 发现 {len(timestamps)} 个截图请求: {matches}")

        try:
            # 下载视频
            video_path = self.downloader.download_video(
                video_url=video_url,
                output_dir=str(settings.data_dir),
            )

            # 提取截图
            frame_paths = self.downloader.extract_frames(
                video_path=video_path,
                timestamps=timestamps,
                output_dir=str(task_dir / "screenshots"),
            )

            # 替换标记为图片
            for i, (minutes, seconds) in enumerate(matches):
                marker = f"[[Screenshot:{minutes}:{seconds}]]"
                if i < len(frame_paths):
                    # 使用相对路径
                    rel_path = f"screenshots/{Path(frame_paths[i]).name}"
                    img_markdown = f"![截图 {minutes}:{seconds}]({rel_path})"
                    markdown = markdown.replace(marker, img_markdown)
                    logger.info(f"[截图] 替换 {marker} -> {img_markdown}")
                else:
                    # 移除无效的标记
                    markdown = markdown.replace(marker, "")
                    logger.warning(f"[截图] 截图失败，移除标记: {marker}")

        except Exception as e:
            logger.warning(f"[截图] 处理截图失败: {e}")
            # 移除所有截图标记
            markdown = re.sub(pattern, "", markdown)

        return markdown

    # ==================== 状态管理 ====================

    @staticmethod
    def _update_status(task_dir: Path, status: str, message: str = ""):
        """原子更新任务状态文件"""
        status_file = task_dir / "status.json"
        data = {"status": status, "message": message}
        temp_file = status_file.with_suffix(".tmp")
        temp_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        temp_file.replace(status_file)

    @staticmethod
    def _find_dir_by_task_id(task_id: str) -> Optional[Path]:
        """根据 task_id 查找任务目录"""
        # 1. 直接查找（UUID 格式）
        direct_dir = settings.output_dir / task_id
        if direct_dir.exists() and (direct_dir / "status.json").exists():
            return direct_dir

        # 2. 通过映射文件查找
        for item in settings.output_dir.iterdir():
            if item.is_dir():
                mapping_file = item / ".task_id"
                if mapping_file.exists():
                    stored_task_id = mapping_file.read_text(encoding="utf-8").strip()
                    if stored_task_id == task_id:
                        return item
        return None

    @staticmethod
    def get_status(task_id: str) -> dict:
        """读取任务状态"""
        # 尝试直接查找或通过 task_id 映射查找
        task_dir = NoteService._find_dir_by_task_id(task_id)
        if not task_dir:
            task_dir = settings.output_dir / task_id

        status_file = task_dir / "status.json"

        if not status_file.exists():
            return {"status": "not_found", "message": "任务不存在"}

        return json.loads(status_file.read_text(encoding="utf-8"))

    @staticmethod
    def get_result(task_id: str) -> Optional[dict]:
        """读取任务结果"""
        # 尝试直接查找或通过 task_id 映射查找
        task_dir = NoteService._find_dir_by_task_id(task_id)
        if not task_dir:
            task_dir = settings.output_dir / task_id

        result_file = task_dir / "result.json"

        if not result_file.exists():
            return None

        return json.loads(result_file.read_text(encoding="utf-8"))

    @staticmethod
    def _save_result(task_dir: Path, result: NoteResult):
        """保存最终结果到 JSON"""
        result_file = task_dir / "result.json"
        data = {
            "markdown": result.markdown,
            "title": result.audio_meta.title,
            "duration": result.audio_meta.duration,
            "platform": result.audio_meta.platform,
            "video_id": result.audio_meta.video_id,
            "cover_url": result.audio_meta.cover_url,
        }
        result_file.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

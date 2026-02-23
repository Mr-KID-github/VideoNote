"""
基于 OpenAI 兼容 API 的 LLM 总结器
支持 OpenAI / DeepSeek / 通义千问 / Ollama 等所有兼容接口

也支持 MiniMax Anthropic 兼容模式 (需要使用 AnthropicLLM 类)
"""
import logging
from datetime import timedelta
from typing import List, Optional

from openai import OpenAI

from app.llm.base import LLMSummarizer
from app.llm.prompts import SYSTEM_PROMPT, build_user_prompt
from app.models.transcript import TranscriptSegment

logger = logging.getLogger(__name__)


class OpenAILLM(LLMSummarizer):
    """
    通用 OpenAI 兼容 LLM

    通过设置不同的 base_url 支持:
    - OpenAI:      https://api.openai.com/v1
    - DeepSeek:    https://api.deepseek.com/v1
    - 通义千问:     https://dashscope.aliyuncs.com/compatible-mode/v1
    - Ollama:      http://localhost:11434/v1
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.openai.com/v1",
        model: str = "gpt-4o-mini",
        temperature: float = 0.7,
    ):
        self.model = model
        self.temperature = temperature
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        logger.info(f"[LLM] 初始化完成: model={model}, base_url={base_url}")

    @staticmethod
    def _format_time(seconds: float) -> str:
        """将秒数格式化为 mm:ss"""
        td = timedelta(seconds=int(seconds))
        total_seconds = int(td.total_seconds())
        minutes = total_seconds // 60
        secs = total_seconds % 60
        return f"{minutes:02d}:{secs:02d}"

    def _build_segment_text(self, segments: List[TranscriptSegment]) -> str:
        """将转写分段格式化为 '时间 - 文本' 的文本块"""
        lines = []
        for seg in segments:
            time_str = self._format_time(seg.start)
            lines.append(f"{time_str} - {seg.text}")
        return "\n".join(lines)

    def summarize(
        self,
        title: str,
        segments: List[TranscriptSegment],
        style: str = "detailed",
        extras: str | None = None,
    ) -> str:
        """
        调用 LLM 生成结构化笔记

        :param title: 视频标题
        :param segments: 转写分段列表
        :param style: 笔记风格
        :param extras: 额外提示词
        :return: Markdown 笔记
        """
        segment_text = self._build_segment_text(segments)
        user_prompt = build_user_prompt(
            title=title,
            segment_text=segment_text,
            style=style,
            extras=extras,
        )

        logger.info(
            f"[LLM] 开始总结: model={self.model}, style={style}, "
            f"segments={len(segments)}, prompt_len={len(user_prompt)}"
        )

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=self.temperature,
        )

        markdown = response.choices[0].message.content.strip()
        logger.info(f"[LLM] 总结完成: output_len={len(markdown)}")
        return markdown


class AnthropicLLM(LLMSummarizer):
    """
    Anthropic SDK 兼容 LLM (支持 MiniMax Anthropic 兼容模式)

    使用方法:
    - base_url: https://api.minimaxi.com/anthropic
    - model: MiniMax-M2.5 / MiniMax-M2.5-highspeed 等

    需要安装: pip install anthropic
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.minimaxi.com/anthropic",
        model: str = "MiniMax-M2.5",
        temperature: float = 1.0,
    ):
        try:
            import anthropic
        except ImportError:
            raise ImportError("请安装 anthropic SDK: pip install anthropic")

        self.model = model
        self.temperature = temperature
        # Anthropic SDK 使用 http_client 处理自定义 base_url
        self.client = anthropic.Anthropic(
            api_key=api_key,
            base_url=base_url,
        )
        logger.info(f"[AnthropicLLM] 初始化完成: model={model}, base_url={base_url}")

    @staticmethod
    def _format_time(seconds: float) -> str:
        """将秒数格式化为 mm:ss"""
        td = timedelta(seconds=int(seconds))
        total_seconds = int(td.total_seconds())
        minutes = total_seconds // 60
        secs = total_seconds % 60
        return f"{minutes:02d}:{secs:02d}"

    def _build_segment_text(self, segments: List[TranscriptSegment]) -> str:
        """将转写分段格式化为 '时间 - 文本' 的文本块"""
        lines = []
        for seg in segments:
            time_str = self._format_time(seg.start)
            lines.append(f"{time_str} - {seg.text}")
        return "\n".join(lines)

    def summarize(
        self,
        title: str,
        segments: List[TranscriptSegment],
        style: str = "detailed",
        extras: str | None = None,
    ) -> str:
        """
        调用 Anthropic 兼容 LLM 生成结构化笔记

        :param title: 视频标题
        :param segments: 转写分段列表
        :param style: 笔记风格
        :param extras: 额外提示词
        :return: Markdown 笔记
        """
        segment_text = self._build_segment_text(segments)
        user_prompt = build_user_prompt(
            title=title,
            segment_text=segment_text,
            style=style,
            extras=extras,
        )

        logger.info(
            f"[AnthropicLLM] 开始总结: model={self.model}, style={style}, "
            f"segments={len(segments)}, prompt_len={len(user_prompt)}"
        )

        response = self.client.messages.create(
            model=self.model,
            max_tokens=8192,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": [{"type": "text", "text": user_prompt}]}
            ],
            temperature=self.temperature,
        )

        # 解析响应内容
        markdown = ""
        for block in response.content:
            if block.type == "text":
                markdown = block.text.strip()
                break

        logger.info(f"[AnthropicLLM] 总结完成: output_len={len(markdown)}")
        return markdown

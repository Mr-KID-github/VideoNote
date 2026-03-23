"""
LLM implementations.
"""
import logging
from datetime import timedelta
from typing import List

from openai import OpenAI

from app.config import settings
from app.llm.base import LLMSummarizer
from app.llm.prompts import SYSTEM_PROMPT, build_user_prompt
from app.models.transcript import TranscriptSegment

logger = logging.getLogger(__name__)


class _BasePromptLLM(LLMSummarizer):
    @staticmethod
    def _format_time(seconds: float) -> str:
        td = timedelta(seconds=int(seconds))
        total_seconds = int(td.total_seconds())
        minutes = total_seconds // 60
        secs = total_seconds % 60
        return f"{minutes:02d}:{secs:02d}"

    def _build_segment_text(self, segments: List[TranscriptSegment]) -> str:
        return "\n".join(f"{self._format_time(seg.start)} - {seg.text}" for seg in segments)

    def _build_user_prompt(
        self,
        title: str,
        segments: List[TranscriptSegment],
        style: str,
        extras: str | None,
    ) -> str:
        return build_user_prompt(
            title=title,
            segment_text=self._build_segment_text(segments),
            style=style,
            extras=extras,
        )


class OpenAILLM(_BasePromptLLM):
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.openai.com/v1",
        model: str = "gpt-4o-mini",
        temperature: float = 0.7,
    ):
        self.model = model
        self.temperature = temperature
        self.client = OpenAI(api_key=api_key, base_url=base_url, timeout=300.0)
        logger.info("[LLM] init openai-compatible model=%s base_url=%s", model, base_url)

    def summarize(
        self,
        title: str,
        segments: List[TranscriptSegment],
        style: str = "detailed",
        extras: str | None = None,
    ) -> str:
        user_prompt = self._build_user_prompt(title, segments, style, extras)
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=self.temperature,
        )
        return (response.choices[0].message.content or "").strip()


class AnthropicLLM(_BasePromptLLM):
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.minimaxi.com/anthropic",
        model: str = "MiniMax-M2.5",
        temperature: float = 1.0,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.temperature = temperature
        logger.info("[LLM] init anthropic-compatible model=%s base_url=%s", model, self.base_url)

    def _messages_url(self) -> str:
        if self.base_url.endswith("/v1/messages"):
            return self.base_url
        if self.base_url.endswith("/messages"):
            return self.base_url
        if self.base_url.endswith("/v1"):
            return f"{self.base_url}/messages"
        return f"{self.base_url}/v1/messages"

    def summarize(
        self,
        title: str,
        segments: List[TranscriptSegment],
        style: str = "detailed",
        extras: str | None = None,
    ) -> str:
        import httpx

        user_prompt = self._build_user_prompt(title, segments, style, extras)
        response = httpx.post(
            self._messages_url(),
            headers={
                "Content-Type": "application/json",
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
            },
            json={
                "model": self.model,
                "max_tokens": 8192,
                "system": SYSTEM_PROMPT,
                "messages": [{"role": "user", "content": [{"type": "text", "text": user_prompt}]}],
                "temperature": self.temperature,
            },
            timeout=300.0,
        )
        response.raise_for_status()
        payload = response.json()
        for block in payload.get("content", []):
            if isinstance(block, dict) and block.get("type") == "text":
                return (block.get("text") or "").strip()
            block_type = getattr(block, "type", None)
            if block_type == "text":
                return (getattr(block, "text", "") or "").strip()
        return ""


class AzureOpenAILLM(_BasePromptLLM):
    def __init__(
        self,
        api_key: str,
        base_url: str,
        model: str,
        temperature: float = 0.7,
    ):
        self.model = model
        self.temperature = temperature
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        logger.info("[LLM] init azure-openai model=%s base_url=%s", model, self.base_url)

    def _chat_url(self) -> str:
        if "chat/completions" in self.base_url:
            if "api-version=" in self.base_url:
                return self.base_url
            separator = "&" if "?" in self.base_url else "?"
            return f"{self.base_url}{separator}api-version={settings.azure_openai_api_version}"
        return (
            f"{self.base_url}/openai/deployments/{self.model}/chat/completions"
            f"?api-version={settings.azure_openai_api_version}"
        )

    def summarize(
        self,
        title: str,
        segments: List[TranscriptSegment],
        style: str = "detailed",
        extras: str | None = None,
    ) -> str:
        import httpx

        user_prompt = self._build_user_prompt(title, segments, style, extras)
        response = httpx.post(
            self._chat_url(),
            headers={"Content-Type": "application/json", "api-key": self.api_key},
            json={
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                "max_tokens": 8192,
                "temperature": self.temperature,
            },
            timeout=300.0,
        )
        response.raise_for_status()
        payload = response.json()
        return (payload["choices"][0]["message"]["content"] or "").strip()

"""
笔记生成相关数据模型
"""
from dataclasses import dataclass
from typing import List, Optional

from pydantic import BaseModel

from app.models.audio import AudioDownloadResult
from app.models.transcript import TranscriptResult


# -------- API 请求 / 响应模型 (Pydantic) --------

class NoteRequest(BaseModel):
    """生成笔记的请求体"""
    video_url: str                                     # 视频链接
    platform: str = "auto"                             # 平台 (youtube / bilibili / auto)
    style: Optional[str] = "detailed"                  # 笔记风格
    extras: Optional[str] = None                       # 额外提示词
    model_name: Optional[str] = None                   # 覆盖默认 LLM 模型
    api_key: Optional[str] = None                      # 覆盖默认 API Key
    base_url: Optional[str] = None                     # 覆盖默认 Base URL


class NoteResponse(BaseModel):
    """同步返回的笔记结果"""
    task_id: str
    title: str
    markdown: str
    duration: float
    platform: str
    video_id: str


class TaskStatusResponse(BaseModel):
    """异步任务状态"""
    task_id: str
    status: str          # pending / downloading / transcribing / summarizing / success / failed
    message: str = ""
    result: Optional[NoteResponse] = None


# -------- 内部数据模型 (dataclass) --------

@dataclass
class NoteResult:
    """Pipeline 最终产物"""
    markdown: str
    transcript: TranscriptResult
    audio_meta: AudioDownloadResult

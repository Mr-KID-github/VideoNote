"""
Request and response models for note generation.
"""
from dataclasses import dataclass
from typing import Optional

from pydantic import BaseModel

from app.models.audio import AudioDownloadResult
from app.models.transcript import TranscriptResult


class NoteRequest(BaseModel):
    video_url: str
    platform: str = "auto"
    style: Optional[str] = "detailed"
    extras: Optional[str] = None
    model_profile_id: Optional[str] = None
    model_name: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None


class LocalFileRequest(BaseModel):
    file_path: str
    title: Optional[str] = None
    style: Optional[str] = "meeting"
    extras: Optional[str] = None
    model_profile_id: Optional[str] = None
    model_name: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None


class NoteResponse(BaseModel):
    task_id: str
    title: str
    markdown: str
    duration: float
    platform: str
    video_id: str


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    message: str = ""
    result: Optional[NoteResponse] = None


@dataclass
class NoteResult:
    markdown: str
    transcript: TranscriptResult
    audio_meta: AudioDownloadResult
    output_dir: str | None = None

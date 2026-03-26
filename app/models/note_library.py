from datetime import datetime

from pydantic import BaseModel, Field


class NoteRecordResponse(BaseModel):
    id: str
    title: str
    content: str
    video_url: str | None = None
    source_type: str | None = None
    task_id: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class NoteCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content: str = ""
    video_url: str | None = None
    source_type: str | None = None
    task_id: str | None = None
    status: str = "done"


class NoteUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content: str = ""

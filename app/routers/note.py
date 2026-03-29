"""
Note generation API routes.
"""
import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse

from app.llm.prompts import STYLE_MAP
from app.models.auth import AuthenticatedUser
from app.models.note import LocalFileRequest, NoteRequest, NoteResponse, TaskStatusResponse
from app.services.auth_service import get_optional_current_user
from app.services.note_service import NoteService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["notes"])
_note_service = NoteService()


@router.post("/generate")
def generate_note_async(
    req: NoteRequest,
    background_tasks: BackgroundTasks,
    user: AuthenticatedUser | None = Depends(get_optional_current_user),
):
    task_id = str(uuid.uuid4())
    background_tasks.add_task(_run_task, task_id=task_id, req=req, user_id=user.user_id if user else None)
    return {"task_id": task_id, "status": "pending", "message": "Task submitted"}


@router.post("/generate_sync", response_model=NoteResponse)
def generate_note_sync(
    req: NoteRequest,
    user: AuthenticatedUser | None = Depends(get_optional_current_user),
):
    task_id = str(uuid.uuid4())
    try:
        result = _note_service.generate(
            video_url=req.video_url,
            task_id=task_id,
            platform=req.platform,
            style=req.style or "detailed",
            summary_mode=req.summary_mode,
            extras=req.extras,
            output_language=req.output_language,
            model_profile_id=req.model_profile_id,
            stt_profile_id=req.stt_profile_id,
            model_name=req.model_name,
            api_key=req.api_key,
            base_url=req.base_url,
            user_id=user.user_id if user else None,
        )
    except Exception as exc:
        logger.error("[API] generate_sync failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return NoteResponse(
        task_id=task_id,
        title=result.audio_meta.title,
        markdown=result.markdown,
        duration=result.audio_meta.duration,
        platform=result.audio_meta.platform,
        video_id=result.audio_meta.video_id,
        summary_mode=result.summary_mode,
    )


@router.get("/task/{task_id}", response_model=TaskStatusResponse)
def get_task_status(task_id: str):
    status_data = _note_service.get_status(task_id)
    status = status_data.get("status", "not_found")
    message = status_data.get("message", "")
    result = None
    if status == "success":
        result_data = _note_service.get_result(task_id)
        if result_data:
            result = NoteResponse(
                task_id=task_id,
                title=result_data.get("title", ""),
                markdown=result_data.get("markdown", ""),
                duration=result_data.get("duration", 0),
                platform=result_data.get("platform", ""),
                video_id=result_data.get("video_id", ""),
                summary_mode=result_data.get("summary_mode", "default"),
            )
    return TaskStatusResponse(task_id=task_id, status=status, message=message, result=result)


@router.get("/task/{task_id}/artifacts/{asset_path:path}", include_in_schema=False)
def get_task_artifact(task_id: str, asset_path: str):
    task_dir = _note_service.artifact_service.find_task_dir(task_id)
    if not task_dir:
        raise HTTPException(status_code=404, detail="Task not found")

    normalized_parts = Path(asset_path).parts
    if not normalized_parts or normalized_parts[0] not in {"screenshots", "media"}:
        raise HTTPException(status_code=404, detail="Artifact not found")

    requested_path = (task_dir / asset_path).resolve()
    task_root = task_dir.resolve()
    if task_root not in requested_path.parents and requested_path != task_root:
        raise HTTPException(status_code=404, detail="Artifact not found")
    if not requested_path.exists() or not requested_path.is_file():
        raise HTTPException(status_code=404, detail="Artifact not found")

    return FileResponse(Path(requested_path))


@router.get("/styles")
def get_styles():
    return {"styles": [{"value": key, "description": value} for key, value in STYLE_MAP.items()]}


@router.post("/generate_from_file", response_model=dict)
def generate_from_file_async(
    req: LocalFileRequest,
    background_tasks: BackgroundTasks,
    user: AuthenticatedUser | None = Depends(get_optional_current_user),
):
    task_id = str(uuid.uuid4())
    background_tasks.add_task(
        _run_task_from_file,
        task_id=task_id,
        req=req,
        user_id=user.user_id if user else None,
    )
    return {"task_id": task_id, "status": "pending", "message": "Task submitted"}


@router.post("/generate_from_file_sync", response_model=NoteResponse)
def generate_from_file_sync(
    req: LocalFileRequest,
    user: AuthenticatedUser | None = Depends(get_optional_current_user),
):
    task_id = str(uuid.uuid4())
    try:
        result = _note_service.generate_from_file(
            file_path=req.file_path,
            task_id=task_id,
            title=req.title,
            style=req.style or "meeting",
            summary_mode=req.summary_mode,
            extras=req.extras,
            output_language=req.output_language,
            model_profile_id=req.model_profile_id,
            stt_profile_id=req.stt_profile_id,
            model_name=req.model_name,
            api_key=req.api_key,
            base_url=req.base_url,
            user_id=user.user_id if user else None,
        )
    except Exception as exc:
        logger.error("[API] generate_from_file_sync failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return NoteResponse(
        task_id=task_id,
        title=result.audio_meta.title,
        markdown=result.markdown,
        duration=result.audio_meta.duration,
        platform=result.audio_meta.platform,
        video_id=result.audio_meta.video_id,
        summary_mode=result.summary_mode,
    )


def _run_task(task_id: str, req: NoteRequest, user_id: str | None):
    try:
        _note_service.generate(
            video_url=req.video_url,
            task_id=task_id,
            platform=req.platform,
            style=req.style or "detailed",
            summary_mode=req.summary_mode,
            extras=req.extras,
            output_language=req.output_language,
            model_profile_id=req.model_profile_id,
            stt_profile_id=req.stt_profile_id,
            model_name=req.model_name,
            api_key=req.api_key,
            base_url=req.base_url,
            user_id=user_id,
        )
    except Exception as exc:
        logger.error("[Background] task failed task_id=%s error=%s", task_id, exc, exc_info=True)


def _run_task_from_file(task_id: str, req: LocalFileRequest, user_id: str | None):
    try:
        _note_service.generate_from_file(
            file_path=req.file_path,
            task_id=task_id,
            title=req.title,
            style=req.style or "meeting",
            summary_mode=req.summary_mode,
            extras=req.extras,
            output_language=req.output_language,
            model_profile_id=req.model_profile_id,
            stt_profile_id=req.stt_profile_id,
            model_name=req.model_name,
            api_key=req.api_key,
            base_url=req.base_url,
            user_id=user_id,
        )
    except Exception as exc:
        logger.error("[Background] local task failed task_id=%s error=%s", task_id, exc, exc_info=True)

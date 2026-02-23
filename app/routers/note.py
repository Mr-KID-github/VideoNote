"""
笔记 API 路由

提供两种调用方式:
  1. POST /api/generate        — 异步模式：立即返回 task_id，后台处理
  2. POST /api/generate_sync   — 同步模式：等待处理完成后返回结果
  3. GET  /api/task/{task_id}   — 查询异步任务状态与结果
  4. GET  /api/styles           — 获取支持的笔记风格列表
"""
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.models.note import NoteRequest, NoteResponse, TaskStatusResponse
from app.services.note_service import NoteService
from app.llm.prompts import STYLE_MAP

logger = logging.getLogger(__name__)
router = APIRouter(tags=["笔记"])

# 全局单例 service
_note_service = NoteService()


# ==================== API Endpoints ====================


@router.post("/generate", summary="异步生成笔记")
def generate_note_async(req: NoteRequest, background_tasks: BackgroundTasks):
    """
    提交视频笔记生成任务（后台异步处理）

    返回 task_id，通过 GET /api/task/{task_id} 轮询结果
    """
    task_id = str(uuid.uuid4())

    background_tasks.add_task(
        _run_task,
        task_id=task_id,
        req=req,
    )

    logger.info(f"[API] 异步任务已提交: task_id={task_id}")
    return {"task_id": task_id, "status": "pending", "message": "任务已提交"}


@router.post("/generate_sync", summary="同步生成笔记", response_model=NoteResponse)
def generate_note_sync(req: NoteRequest):
    """
    同步生成视频笔记（等待完成后返回）

    适合短视频或测试使用，长视频建议使用异步接口
    """
    task_id = str(uuid.uuid4())

    try:
        result = _note_service.generate(
            video_url=req.video_url,
            task_id=task_id,
            platform=req.platform,
            style=req.style or "detailed",
            extras=req.extras,
            model_name=req.model_name,
            api_key=req.api_key,
            base_url=req.base_url,
        )
    except Exception as e:
        logger.error(f"[API] 同步生成失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

    return NoteResponse(
        task_id=task_id,
        title=result.audio_meta.title,
        markdown=result.markdown,
        duration=result.audio_meta.duration,
        platform=result.audio_meta.platform,
        video_id=result.audio_meta.video_id,
    )


@router.get("/task/{task_id}", summary="查询任务状态", response_model=TaskStatusResponse)
def get_task_status(task_id: str):
    """
    查询异步任务的处理状态

    状态流转: pending → downloading → transcribing → summarizing → success / failed
    """
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
            )

    return TaskStatusResponse(
        task_id=task_id,
        status=status,
        message=message,
        result=result,
    )


@router.get("/styles", summary="获取笔记风格列表")
def get_styles():
    """返回支持的笔记风格"""
    return {
        "styles": [
            {"value": key, "description": val}
            for key, val in STYLE_MAP.items()
        ]
    }


# ==================== 后台任务执行 ====================


def _run_task(task_id: str, req: NoteRequest):
    """后台执行笔记生成任务"""
    try:
        _note_service.generate(
            video_url=req.video_url,
            task_id=task_id,
            platform=req.platform,
            style=req.style or "detailed",
            extras=req.extras,
            model_name=req.model_name,
            api_key=req.api_key,
            base_url=req.base_url,
        )
    except Exception as e:
        logger.error(f"[后台任务] 失败: task_id={task_id}, error={e}", exc_info=True)

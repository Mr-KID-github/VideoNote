"""
VideoNote - 纯后端视频总结系统
"""
from fastapi import FastAPI


def create_app() -> FastAPI:
    from app.routers import note

    app = FastAPI(
        title="VideoNote",
        description="纯后端视频总结 API — 输入视频链接，输出结构化 Markdown 笔记",
        version="0.1.0",
    )
    app.include_router(note.router, prefix="/api")
    return app

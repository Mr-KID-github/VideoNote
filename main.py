"""
VideoNote — 纯后端视频总结系统

启动命令:
    python main.py
    或
    uvicorn main:app --host 0.0.0.0 --port 8900 --reload
"""
import logging

import uvicorn

from app import create_app
from app.config import settings

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)

logger = logging.getLogger("videonote")

app = create_app()

if __name__ == "__main__":
    logger.info(f"🚀 VideoNote 启动中 http://{settings.host}:{settings.port}")
    logger.info(f"📖 API 文档: http://127.0.0.1:{settings.port}/docs")
    logger.info(f"🤖 LLM: {settings.llm_model} @ {settings.llm_base_url}")
    logger.info(f"🎙️ Whisper: {settings.whisper_model_size} ({settings.whisper_device})")

    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        reload=False,
    )

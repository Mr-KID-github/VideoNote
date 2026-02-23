"""
VideoNote 配置模块
从 .env 文件加载所有配置项，提供全局单例 settings
"""
import os
from pathlib import Path
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent


@dataclass
class Settings:
    """全局配置"""

    # 服务
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8900"))

    # LLM
    llm_api_key: str = os.getenv("LLM_API_KEY", "")
    llm_base_url: str = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
    llm_model: str = os.getenv("LLM_MODEL", "gpt-4o-mini")

    # 转写器类型: groq / whisper
    transcriber_type: str = os.getenv("TRANSCRIBER_TYPE", "groq")

    # Groq Whisper (云端转写，零依赖，推荐)
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")

    # 本地 Whisper (需安装 openai-whisper + ffmpeg)
    whisper_model_size: str = os.getenv("WHISPER_MODEL_SIZE", "base")
    whisper_device: str = os.getenv("WHISPER_DEVICE", "cpu")

    # 存储路径
    data_dir: Path = BASE_DIR / os.getenv("DATA_DIR", "data")
    output_dir: Path = BASE_DIR / os.getenv("OUTPUT_DIR", "output")

    def __post_init__(self):
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()

"""
VideoNote configuration.
"""
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent


@dataclass
class Settings:
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8900"))

    llm_api_key: str = os.getenv("LLM_API_KEY", "")
    llm_base_url: str = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
    llm_model: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    llm_provider: str = os.getenv("LLM_PROVIDER", "openai-compatible")

    transcriber_type: str = os.getenv("TRANSCRIBER_TYPE", "groq")
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    whisper_model_size: str = os.getenv("WHISPER_MODEL_SIZE", "base")
    whisper_device: str = os.getenv("WHISPER_DEVICE", "cpu")
    faster_whisper_compute_type: str = os.getenv("FASTER_WHISPER_COMPUTE_TYPE", "int8")
    sensevoice_base_url: str = os.getenv("SENSEVOICE_BASE_URL", "http://localhost:50000")
    sensevoice_language: str = os.getenv("SENSEVOICE_LANGUAGE", "auto")
    sensevoice_model_size: str = os.getenv("SENSEVOICE_MODEL_SIZE", "small")
    sensevoice_use_gpu: bool = os.getenv("SENSEVOICE_USE_GPU", "false").lower() == "true"

    data_dir: Path = BASE_DIR / os.getenv("DATA_DIR", "data")
    output_dir: Path = BASE_DIR / os.getenv("OUTPUT_DIR", "output")

    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    supabase_jwt_secret: str = os.getenv("SUPABASE_JWT_SECRET", "")

    model_profile_encryption_key: str = os.getenv("MODEL_PROFILE_ENCRYPTION_KEY", "")
    azure_openai_api_version: str = os.getenv("AZURE_OPENAI_API_VERSION", "2024-10-21")

    def __post_init__(self):
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()

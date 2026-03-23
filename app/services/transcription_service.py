"""
Audio transcription helpers.
"""
import logging
import subprocess
from typing import Callable

from app.config import settings
from app.models.transcript import TranscriptResult
from app.transcribers.base import Transcriber

logger = logging.getLogger(__name__)

StatusCallback = Callable[[str, str], None]


def create_transcriber() -> Transcriber:
    t_type = settings.transcriber_type.lower()

    if t_type == "groq":
        from app.transcribers.groq_transcriber import GroqWhisperTranscriber

        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY is not configured")
        return GroqWhisperTranscriber(api_key=settings.groq_api_key)

    if t_type == "whisper":
        from app.transcribers.whisper_transcriber import WhisperTranscriber

        return WhisperTranscriber(model_size=settings.whisper_model_size, device=settings.whisper_device)

    if t_type == "faster-whisper":
        from app.transcribers.faster_whisper_transcriber import FasterWhisperTranscriber

        return FasterWhisperTranscriber(
            model_size=settings.whisper_model_size,
            device=settings.whisper_device,
            compute_type=settings.faster_whisper_compute_type,
        )

    if t_type == "sensevoice":
        from app.transcribers.sensevoice_transcriber import SenseVoiceTranscriber

        return SenseVoiceTranscriber(base_url=settings.sensevoice_base_url, language=settings.sensevoice_language)

    if t_type == "sensevoice-local":
        from app.transcribers.sensevoice_local_transcriber import SenseVoiceLocalTranscriber

        return SenseVoiceLocalTranscriber(
            model_size=settings.sensevoice_model_size,
            device="cuda" if settings.sensevoice_use_gpu else "cpu",
            language=settings.sensevoice_language,
            use_gpu=settings.sensevoice_use_gpu,
        )

    raise ValueError(f"Unsupported transcriber type: {t_type}")


class TranscriptionService:
    def __init__(self, transcriber: Transcriber | None = None):
        self.transcriber = transcriber or create_transcriber()

    @staticmethod
    def get_audio_duration(file_path: str) -> float:
        try:
            cmd = [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                file_path,
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return float(result.stdout.strip())
        except Exception as exc:
            logger.warning("[FFprobe] failed to read duration: %s", exc)
            return 0.0

    def transcribe(
        self,
        *,
        audio_path: str,
        load_cached: Callable[[], TranscriptResult | None],
        save_transcript: Callable[[TranscriptResult], None],
        update_status: StatusCallback | None = None,
    ) -> TranscriptResult:
        cached = load_cached()
        if cached:
            logger.info("[Transcribe] cache hit for audio=%s", audio_path)
            return cached

        if settings.transcriber_type.lower() in {"whisper", "faster-whisper", "sensevoice-local"} and update_status:
            update_status("transcribing", "Loading local speech model...")

        transcript = self.transcriber.transcribe(file_path=audio_path)
        if update_status:
            update_status("transcribing", "Saving transcription...")

        save_transcript(transcript)
        return transcript

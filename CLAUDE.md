# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VideoNote is a FastAPI-based backend system that generates structured Markdown notes from video URLs. It downloads video audio, transcribes it using Whisper (either Groq cloud API or local), and uses an LLM to generate formatted notes in various styles.

## Commands

### Activate conda environment
```bash
conda activate videonote
```

### Run the server
```bash
python main.py
# or
uvicorn main:app --host 0.0.0.0 --port 8900 --reload
```

### Install dependencies
```bash
pip install -r requirements.txt
```

### Required system dependency
FFmpeg must be installed separately (required for audio extraction).

## Faster-Whisper (Recommended Local Transcription)

Using `faster-whisper` is recommended for local transcription - it's faster than openai-whisper and has lower memory usage.

### Setup
```bash
# Make sure to activate conda environment first
conda activate videonote

# Install faster-whisper
pip install faster-whisper
```

### Configuration (.env)
```bash
TRANSCRIBER_TYPE=faster-whisper
WHISPER_MODEL_SIZE=base       # tiny/base/small/medium/large-v3
WHISPER_DEVICE=cpu             # cpu or cuda (if you have GPU)
FASTER_WHISPER_COMPUTE_TYPE=int8  # int8 (fastest, CPU recommended) / float16 / float32
```

### Model Download
Models will be automatically downloaded on first use. Default `base` model is ~140MB.

## Configuration

All configuration is managed via `.env` file (copy from `.env.example`):
- `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` - LLM settings (supports OpenAI-compatible and Anthropic-compatible APIs like MiniMax)
- `TRANSCRIBER_TYPE` - Choose from: `groq` (cloud), `whisper` (local openai-whisper), `faster-whisper` (recommended local), or `sensevoice`/`sensevoice-local`
- `GROQ_API_KEY` - Required if using groq transcriber
- `WHISPER_MODEL_SIZE` - Model size: tiny/base/small/medium/large-v3 (default: base)
- `WHISPER_DEVICE` - Device: cpu/cuda (default: cpu)
- `FASTER_WHISPER_COMPUTE_TYPE` - Compute type: int8/float16/float32 (default: int8, recommended for CPU)

## Architecture

The system uses a **pipeline-based architecture** with three main stages:

1. **Download** (`app/downloaders/`) - Downloads video audio using yt-dlp
   - Base class: `Downloader` in `base.py`
   - Implementation: `YtdlpDownloader` in `ytdlp_downloader.py`

2. **Transcribe** (`app/transcribers/`) - Converts audio to text
   - Base class: `Transcriber` in `base.py`
   - Implementations: `WhisperTranscriber` (local openai-whisper), `FasterWhisperTranscriber` (local, recommended), `GroqWhisperTranscriber` (cloud)
   - Configurable via `TRANSCRIBER_TYPE` environment variable

3. **Summarize** (`app/llm/`) - Generates Markdown notes using LLM
   - Base class: `LLMSummarizer` in `base.py`
   - Implementation: `OpenAILLM` (OpenAI-compatible), `AnthropicLLM` (Anthropic-compatible for MiniMax)
   - Prompt templates in `prompts.py`

### Core Pipeline

The `NoteService` class in `app/services/note_service.py` orchestrates the entire flow:
```
video_url → download → transcribe → LLM summarize → screenshot processing → markdown note
```

Each step caches results in `output/{datetime_title}/`:
- `audio_meta.json` - Download metadata
- `transcript.json` - Transcribed text with timestamps
- `note.md` - Final Markdown output with screenshots
- `screenshots/` - Extracted video screenshots
- `status.json` - Task status
- `result.json` - Final result

### API Routes

Defined in `app/routers/note.py`:
- `POST /api/generate` - Async: returns task_id immediately, processes in background
- `POST /api/generate_sync` - Sync: waits for completion and returns result
- `GET /api/task/{task_id}` - Poll async task status
- `GET /api/styles` - List supported note styles

### MCP Server

VideoNote can be used as an MCP server for other AI assistants:

- **File**: `mcp_server.py`
- **Tools**: `generate_video_note`, `list_note_styles`
- **Configuration**: Add to `~/.mcp.json`

### Note Styles

Six styles defined in `app/llm/prompts.py`:
- `minimal` - Core要点 only
- `detailed` - Complete content (default)
- `academic` - Academic writing style
- `tutorial` - Step-by-step instructions
- `meeting` - Meeting minutes format
- `xiaohongshu` - Casual with emojis

## Key Files

- `main.py` - Entry point, runs uvicorn
- `mcp_server.py` - MCP server for AI assistant integration
- `app/__init__.py` - FastAPI app factory
- `app/config.py` - Settings dataclass, loads from .env
- `app/services/note_service.py` - Core pipeline orchestration
- `app/llm/prompts.py` - System prompt and style templates

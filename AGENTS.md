# Repository Guidelines

## Architecture Overview
VINote is a full-stack video-to-note workspace with three moving parts:

- Backend: FastAPI API for downloading media, transcribing audio, generating Markdown notes, and managing per-user model profiles.
- Frontend: Vite + React + TypeScript app for authentication, note generation, note library browsing, editing, and settings.
- Supabase: auth provider plus Postgres-backed storage for notes, model profiles, and user preferences.

The backend can also run as a lightweight MCP server through `mcp_server.py`.

## Project Structure
- `app/`
  - `routers/`: FastAPI route modules. `note.py` exposes generation/status APIs. `model_profiles.py` exposes authenticated model-profile APIs.
  - `services/`: orchestration and domain services.
    - `note_service.py`: main pipeline coordinator.
    - `transcription_service.py`: transcriber selection, chunking, ffmpeg/ffprobe helpers.
    - `llm_service.py`: resolves LLM config from request overrides, saved model profiles, or env defaults.
    - `task_artifact_service.py`: persists status/result/transcript/markdown artifacts under `output/`.
    - `model_profile_*`: Supabase-backed model profile CRUD, encryption, connection testing.
    - `auth_service.py`: validates Supabase JWTs for protected APIs.
    - `screenshot_service.py`: replaces `[[Screenshot:mm:ss]]` placeholders with extracted frame images.
  - `downloaders/`: media download/extraction adapters built around `yt-dlp`.
  - `transcribers/`: speech-to-text providers (`groq`, `whisper`, `faster-whisper`, `sensevoice`, `sensevoice-local`).
  - `llm/`: summarizer implementations and prompt templates.
  - `models/`: Pydantic/dataclass request, response, and domain models.
- `frontend/src/`
  - `pages/`: route-level screens such as home, generator, notes, editor, login, settings.
  - `components/`: reusable UI building blocks.
  - `stores/`: Zustand stores for auth, theme, note generation, note library, model profiles, and language.
  - `lib/`: API wrapper, Supabase client, i18n copy, and model-profile client helpers.
- `supabase/`: local Supabase config, start scripts, and SQL migrations.
- `tests/`: backend unit tests.
- `docs/plans/`: product/design implementation notes.
- `data/`: downloaded audio/video cache and temporary transcription chunks.
- `output/`: per-task artifacts and generated Markdown notes.

## Runtime Flow
1. Frontend authenticates users with Supabase Auth and forwards the access token to backend `/api/*` requests.
2. `NoteService` creates a task directory under `output/`, downloads or prepares audio, and updates `status.json`.
3. `TranscriptionService` loads the selected transcriber, optionally chunks long audio, and saves `transcript.json`.
4. `LLMService` resolves the active model configuration and generates Markdown from transcript segments.
5. `ScreenshotService` optionally downloads the full video and injects extracted frames into note Markdown.
6. `TaskArtifactService` writes `note.md`, `result.json`, `status.json`, and the `.task_id` mapping.
7. Frontend polls `/api/task/{task_id}`, then stores the final note row in Supabase `notes`.

## Build, Run, and Dev Commands
- Backend install: `pip install -r requirements.txt`
- Backend dev server: `uvicorn main:app --host 0.0.0.0 --port 8900 --reload`
- Backend direct run: `python main.py`
- Frontend install: `cd frontend && npm install`
- Frontend dev server: `cd frontend && npm run dev`
- Frontend build: `cd frontend && npm run build`
- Frontend preview: `cd frontend && npm run preview`
- Windows convenience launcher: `.\start-dev.ps1` or `.\start-dev.bat`
- Local Supabase: `.\supabase\start-local.ps1`

Default local ports:
- Backend API/docs: `http://127.0.0.1:8900`
- Frontend dev server: `http://localhost:3100`
- Local Supabase API: `http://127.0.0.1:55321`
- Local Supabase Studio: `http://127.0.0.1:55323`

## Environment and Configuration
Backend settings live in root `.env` and are loaded by `app/config.py`.

Important backend variables:
- `LLM_*`: default summarizer provider/model/base URL/API key.
- `TRANSCRIBER_TYPE`: `groq`, `whisper`, `faster-whisper`, `sensevoice`, or `sensevoice-local`.
- `GROQ_API_KEY`: required when using `groq`.
- `WHISPER_*`, `FASTER_WHISPER_COMPUTE_TYPE`, `SENSEVOICE_*`: provider-specific transcription settings.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`: required for authenticated backend routes.
- `MODEL_PROFILE_ENCRYPTION_KEY`: required to store/decrypt model profile API keys.

Frontend Vite settings live in `frontend/.env.local`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` (leave empty for the local Vite proxy, or set an absolute backend URL)

## Testing and Verification
The repository already contains backend tests under `tests/`.

Recommended checks after code changes:
- Backend unit tests: `pytest tests`
- Frontend type/build check: `cd frontend && npm run build`
- API smoke check: open `http://127.0.0.1:8900/docs`
- Pipeline smoke check: run one sample generation and inspect the created folder under `output/`

## Coding and Collaboration Rules
- Python: follow PEP 8, keep route handlers thin, keep orchestration in `app/services/`.
- TypeScript: keep `strict` compatibility intact, use `PascalCase` for components and `camelCase` for helpers/hooks.
- Prefer focused modules over large multi-purpose files.
- Do not commit generated artifacts from `data/`, `output/`, frontend build output, or local Supabase temp files unless the change explicitly targets them.
- Preserve user changes in a dirty worktree; do not revert unrelated edits.

## Documentation Maintenance
Update `README.md`, this `AGENTS.md`, or both whenever you change:
- runtime ports or startup commands
- environment variables or required services
- API routes or authentication requirements
- project structure or module ownership
- major user-facing flows in the frontend

## Notes for Agents
- The current frontend does not yet upload local files from the browser, even though backend file-based generation endpoints exist.
- Model profile APIs require authenticated users and working Supabase backend settings.
- If documentation and code disagree, trust the code, then fix the documentation in the same change.

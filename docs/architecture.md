# VINote Architecture

## Current Scope

VINote is currently organized around one core product flow:

1. Sign in with an app-owned email/password account.
2. Submit a video URL to the FastAPI backend.
3. Run the note-generation pipeline.
4. Save the generated Markdown note in PostgreSQL.
5. Continue editing the note in the frontend.

Local audio-file generation still exists on the backend, but the browser UI is currently centered on the URL-based workflow.

## Runtime Topology

```text
Frontend (React + cookie auth)
        |
        v
FastAPI routers
        |
        v
Application services
  |- AuthService
  |- NoteService
  |- ModelProfileService
  |- Repositories
        |
        +--> PostgreSQL
        +--> yt-dlp / ffmpeg / ffprobe
        +--> Whisper / Faster-Whisper / Groq / SenseVoice
        +--> OpenAI-compatible / Anthropic-compatible / Azure OpenAI / Ollama
        +--> output/ task artifacts
```

## Backend Structure

### API layer

- `main.py`
  - process entrypoint
- `app/__init__.py`
  - app factory, CORS, startup hooks, router registration
- `app/routers/auth.py`
  - sign-up, sign-in, sign-out, current-user endpoints
- `app/routers/note.py`
  - generation and task polling endpoints
- `app/routers/note_library.py`
  - saved note CRUD endpoints
- `app/routers/preferences.py`
  - user preference endpoints
- `app/routers/model_profiles.py`
  - model profile CRUD and test endpoints

### Domain and infrastructure layer

- `app/services/auth_service.py`
  - password hashing, JWT issue/verify, HttpOnly cookie handling
- `app/services/note_service.py`
  - note generation orchestration only
- `app/services/transcription_service.py`
  - transcriber selection and transcription flow
- `app/services/llm_service.py`
  - model resolution and summarizer selection
- `app/services/screenshot_service.py`
  - screenshot placeholder expansion
- `app/services/task_artifact_service.py`
  - output artifacts and task status files
- `app/services/note_repository.py`
  - note persistence
- `app/services/preferences_repository.py`
  - preference persistence
- `app/services/model_profile_repository.py`
  - encrypted profile persistence
- `app/services/model_profile_connection_service.py`
  - provider connectivity checks

### Database boundary

- `app/db.py`
  - SQLAlchemy engine, session, startup initialization
- `app/db_models.py`
  - ORM tables for users, notes, preferences, and model profiles

Current schema initialization is handled by app startup via SQLAlchemy metadata creation. Alembic is not wired in yet.

## Frontend Structure

### App shell

- `frontend/src/App.tsx`
  - route composition
- `frontend/src/components/Layout/`
  - shell, header, sidebar, theme controls
- `frontend/src/components/Settings/`
  - settings panels and model-profile UI

### Feature pages

- `frontend/src/pages/Home.tsx`
  - workspace landing page
- `frontend/src/pages/Notes.tsx`
  - note library
- `frontend/src/pages/NoteGenerator.tsx`
  - generation flow
- `frontend/src/pages/NoteEditor.tsx`
  - Markdown editing and preview
- `frontend/src/pages/Settings.tsx`
  - appearance, auth, and model profile settings

### State boundaries

- `frontend/src/stores/authStore.ts`
  - cookie-auth lifecycle via backend auth endpoints
- `frontend/src/stores/noteLibraryStore.ts`
  - saved note CRUD via `/api/notes`
- `frontend/src/stores/languageStore.ts`
  - preference sync via `/api/preferences`
- `frontend/src/stores/modelProfileStore.ts`
  - model profile CRUD and testing
- `frontend/src/stores/noteGenerationStore.ts`
  - transient generation state

## Auth and Data Ownership

- VINote owns user accounts directly in PostgreSQL.
- The backend signs JWT access tokens and stores them in an HttpOnly cookie.
- The frontend never reads raw auth tokens directly.
- Provider API keys are stored only on the backend and returned to the browser only as masked hints.
- Task artifacts remain file-based under `output/`.

## Deployment Shape

Current deployment target is:

- `frontend`
- `backend`
- `postgres`

This is true for local Docker and Raspberry Pi LAN deployment. Supabase is no longer part of the runtime stack.

## Historical Note

Some historical planning documents under `docs/plans/` still refer to the earlier Supabase-based architecture. Those files describe design history, not the current runtime implementation.

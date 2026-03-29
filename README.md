# VINote

VINote is a full-stack app that turns video or audio into structured Markdown notes, then saves them into either a personal workspace or a shared team workspace.

Current stack:

- Frontend: React 18 + Vite + TypeScript
- Backend: FastAPI
- Database: PostgreSQL
- Auth: FastAPI-issued JWT stored in an HttpOnly cookie
- Deployment target: local Docker and Raspberry Pi LAN Docker

## Architecture

High-level flow:

```text
Browser
  -> Frontend (React)
  -> FastAPI API
     -> Auth service
     -> Team / membership service
     -> Note generation pipeline
     -> Notes / teams / preferences / model profiles / STT profiles repositories
     -> PostgreSQL
     -> output/ task artifacts
```

Main backend responsibilities:

- `app/routers/`
  - HTTP routes only
- `app/services/note_service.py`
  - note generation orchestration
- `app/services/note_media_service.py`
  - selects key moments from the generated note and injects timestamp jump links plus screenshot markers only for those moments
- `app/services/auth_service.py`
  - email/password auth, JWT issue/verify, auth cookie handling
- `app/services/note_repository.py`
  - personal/team note CRUD plus workspace access control
- `app/services/team_repository.py`
  - team CRUD and membership management
- `app/services/preferences_repository.py`
  - user preference persistence
- `app/services/model_profile_repository.py`
  - encrypted model profile persistence
- `app/services/stt_profile_repository.py`
  - encrypted and local-safe STT profile persistence
- `app/downloaders/`, `app/transcribers/`, `app/llm/`
  - media acquisition, transcription, summarization

Summary modes:

- `default`
  - one-shot for shorter transcripts, hierarchical chunk-first summarization for longer transcripts
- `accurate`
  - always summarizes in chunks first, then merges the chunk drafts into the final note
- `oneshot`
  - always sends the full transcript to the model in one pass

Main frontend responsibilities:

- `frontend/src/pages/`
  - route pages
- `frontend/src/pages/Home.tsx`
  - dashboard-style workspace home with primary actions, system status, developer entry points, and recent notes
- `frontend/src/stores/authStore.ts`
  - cookie-auth session lifecycle
- `frontend/src/stores/noteLibraryStore.ts`
  - note library CRUD via backend API, scoped by the currently selected personal/team workspace
- `frontend/src/stores/teamStore.ts`
  - team list, membership management, and current workspace selection
- `frontend/src/components/Notes/VideoReferencePanel.tsx`
  - sticky source-media panel for timestamp jumping during note preview, with audio fallback for non-embeddable sources
- `frontend/src/components/Notes/KeyMomentsRail.tsx`
  - visual key-moment rail with screenshot cards, timestamps, and jump targets
- `frontend/src/stores/languageStore.ts`
  - language preference sync via backend API
- `frontend/src/stores/modelProfileStore.ts`
  - model profile management
- `frontend/src/stores/sttProfileStore.ts`
  - STT profile management and per-run selection

More detail is in [docs/architecture.md](/Users/25772/Desktop/Project/VideoNote/docs/architecture.md).
Human-readable usage docs now live in the VitePress docs site under [docs/](/Users/25772/Desktop/Project/VideoNote/docs).
The docs site is bilingual: Simplified Chinese is the default entry, and English lives under `/en/`.

Media preview behavior:

- Generated notes now append clickable timestamps only to selected key moments instead of every heading.
- Key moments can carry screenshot thumbnails in both Markdown and the preview-side moment rail.
- Clicking a heading timestamp, key-moment card, inline timestamp, or screenshot seeks the preview-side media panel when possible.
- Embeddable sources such as YouTube and Bilibili render an iframe.
- Audio-only or non-embeddable sources fall back to `/api/notes/{note_id}/media` so timestamp clicks can still seek the extracted audio.
- The note editor now supports a split workspace with a draggable divider between Markdown source and rendered preview.

Workspace behavior:

- Notes are saved into either the personal workspace or one selected team workspace.
- Sidebar workspace switching changes the note list, home-page recent notes, and the save target used by the generator.
- Team members can open, edit, delete, and share team notes through the same `/api/notes/*` endpoints.

STT profile behavior:

- LLM model profiles and STT profiles are managed separately in Settings.
- If a run selects an STT profile, the backend uses it for that task only.
- If no STT profile is selected, the backend falls back to the signed-in user's default STT profile.
- If the user has no default STT profile, the backend falls back to the existing `TRANSCRIBER_*` values from `.env`.

## Repository Layout

```text
VINote/
├─ app/
│  ├─ downloaders/
│  ├─ llm/
│  ├─ models/
│  ├─ routers/
│  ├─ services/
│  ├─ transcribers/
│  ├─ config.py
│  ├─ db.py
│  └─ db_models.py
├─ frontend/
│  ├─ src/
│  └─ docker/
├─ deploy/pi/
├─ docs/
├─ data/
├─ output/
├─ Dockerfile
├─ docker-compose.yml
├─ main.py
└─ mcp_server.py
```

## Local Development

Requirements:

- Python 3.10+
- Node.js 18+
- FFmpeg
- Docker Desktop or Docker Engine if you want the container stack

### 1. Backend setup

```bash
pip install -r requirements.txt
cp .env.example .env
python main.py
```

If you want to use `TRANSCRIBER_TYPE=faster-whisper`, install the optional local-transcriber dependencies as well:

```bash
pip install -r requirements.local-transcribers.txt
```

Backend dev with reload:

```bash
uvicorn main:app --host 0.0.0.0 --port 8900 --reload
```

### 2. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev -- --host 0.0.0.0 --port 3100
```

### 3. Docs setup

```bash
cd docs
npm install
npm run docs:dev
```

The convenience launcher `.\start-dev.ps1` now starts backend, frontend, and docs together.

### 4. Required environment variables

Backend:

- `APP_JWT_SECRET`
- `DATABASE_URL`
- `SHARE_BASE_URL` (optional, overrides the LAN/public base URL used in generated share links)
- `MODEL_PROFILE_ENCRYPTION_KEY`
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`
- `TRANSCRIBER_TYPE`
- `GROQ_API_KEY`
- `WHISPER_MODEL_SIZE`
- `WHISPER_DEVICE`
- `FASTER_WHISPER_COMPUTE_TYPE`
- `SENSEVOICE_BASE_URL`
- `SENSEVOICE_LANGUAGE`
- `SENSEVOICE_MODEL_SIZE`
- `SENSEVOICE_USE_GPU`
- `SUMMARY_DEFAULT_MAX_CHARS`
- `SUMMARY_DEFAULT_MAX_SEGMENTS`
- `SUMMARY_CHUNK_MAX_CHARS`
- `SUMMARY_CHUNK_MAX_SEGMENTS`
- `SUMMARY_CHUNK_OVERLAP_SEGMENTS`

Frontend runtime:

- `VITE_API_BASE_URL`
- `VITE_DOCS_BASE_URL`

For local Vite development, `VITE_API_BASE_URL` can stay empty if you proxy `/api` to the backend.
Set `VITE_DOCS_BASE_URL` when the browser app should open a separately hosted docs site instead of falling back to backend Swagger.
When the frontend runs on `http://localhost:3100` in local dev, the sidebar `Document` link now defaults to `http://localhost:3101/`.

## Docker

The current Docker stack is intentionally simple:

- `postgres`
- `backend`
- `frontend`
- `docs`

Start everything:

```bash
docker compose up --build
```

Default ports:

- Frontend: `http://localhost:3100`
- Backend: `http://localhost:8900`
- Docs: `http://localhost:3101`
- Postgres: `postgresql://vinote:<password>@127.0.0.1:54322/vinote`

Notes:

- The backend container runs database schema initialization automatically on startup.
- Frontend runtime config is injected at container start, so you do not need a separate frontend build per environment.
- The Raspberry Pi deployment target uses this same compose stack. Supabase is no longer part of the runtime architecture.
- The backend also exposes an HTTP MCP endpoint at `/mcp` for LAN clients that can talk to an MCP server over HTTP JSON-RPC.
- The Raspberry Pi deploy helpers force `DOCKER_DEFAULT_PLATFORM=linux/arm/v7` on the remote host to avoid incorrect `arm/v5` image selection on 32-bit Raspberry Pi OS userlands.
- New authenticated STT profile APIs live under `/api/stt-profiles`; note-generation requests can include `stt_profile_id` alongside `model_profile_id`.

## Raspberry Pi LAN Deployment

The repository includes LAN deployment helpers under `deploy/pi/`.

Recommended flow:

1. Copy `.env.example` to `.env` in the repo root and fill in real values.
2. Optional: create `deploy/pi/local.env` from `deploy/pi/local.env.example` with your Pi host, user, and remote directory.
3. Deploy from your development machine:

PowerShell:

```powershell
.\deploy\pi\deploy-pi.ps1
```

Bash:

```bash
./deploy/pi/deploy-pi.sh
```

What the deploy script does:

- validates required local tools
- uploads the root `.env`
- archives the current working tree
- uploads the archive to the Raspberry Pi over SSH
- runs `docker compose up -d --build --remove-orphans` remotely

Pi-specific LAN overrides are documented in [deploy/pi/lan.env.example](/Users/25772/Desktop/Project/VideoNote/deploy/pi/lan.env.example).

After deployment:

- Web app: `http://<pi-lan-ip>:<FRONTEND_PORT>`
- MCP endpoint: `http://<pi-lan-ip>:<BACKEND_PORT>/mcp`

The MCP endpoint is exposed from the FastAPI backend so LAN clients can connect directly without needing a local stdio process.

## Auth Model

VINote no longer depends on Supabase for browser auth.

- `POST /api/auth/sign-up`
- `POST /api/auth/sign-in`
- `POST /api/auth/sign-out`
- `GET /api/auth/session`
- `GET /api/auth/me`

The backend sets an HttpOnly cookie after sign-in or sign-up. Browser requests use `credentials: 'include'`.

Protected browser data APIs:

- `/api/notes`
- `/api/teams`
- `/api/preferences`
- `/api/model-profiles`

## API Notes

Core generation endpoints remain in the FastAPI backend:

- `POST /api/generate`
- `GET /api/task/{task_id}`
- `GET /api/task/{task_id}/artifacts/{asset_path}`
- `POST /mcp`
- `GET /mcp`

Generation requests accept an optional `summary_mode` field with `default`, `accurate`, or `oneshot`.
Generated notes now include per-section video jump links and API-served screenshot assets under the task artifact route above.

Saved-note APIs:

- `GET /api/notes?scope=personal`
- `GET /api/notes?scope=team&team_id={team_id}`
- `GET /api/notes/{id}`
- `POST /api/notes`
- `PATCH /api/notes/{id}`
- `DELETE /api/notes/{id}`
- `GET /api/notes/{id}/share`
- `POST /api/notes/{id}/share`
- `DELETE /api/notes/{id}/share`

`POST /api/notes` now accepts:

- `scope`: `personal` or `team`
- `team_id`: required when `scope` is `team`

Team APIs:

- `GET /api/teams`
- `GET /api/teams/{team_id}`
- `POST /api/teams`
- `POST /api/teams/{team_id}/members`
- `DELETE /api/teams/{team_id}/members/{member_id}`

Public share endpoints:

- `GET /share/{token}`
- `GET /api/public/notes/{token}`

Preference API:

- `GET /api/preferences`
- `PATCH /api/preferences`

## Verification

Useful smoke checks:

- Docs site: `cd docs && npm run docs:build`
- Backend docs: `http://127.0.0.1:8900/docs`
- Signed-in frontend users can open the left sidebar footer `Document` link. It prefers `VITE_DOCS_BASE_URL` and falls back to backend Swagger when no standalone docs URL is configured.
- In local dev on port `3100`, the `Document` link prefers the VitePress docs site on `3101`.
- Backend health: `GET /healthz`
- Frontend production build:

```bash
cd frontend
npm run build
```

- Python import / syntax smoke:

```bash
python -m compileall app main.py
```

## Notes for Historical Docs

Some older planning documents under `docs/plans/` still describe the earlier Supabase-based design. Treat them as historical planning artifacts, not the current runtime architecture.

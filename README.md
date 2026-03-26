# VINote

VINote is a full-stack app that turns video or audio into structured Markdown notes.

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
     -> Note generation pipeline
     -> Notes / preferences / model profiles repositories
     -> PostgreSQL
     -> output/ task artifacts
```

Main backend responsibilities:

- `app/routers/`
  - HTTP routes only
- `app/services/note_service.py`
  - note generation orchestration
- `app/services/auth_service.py`
  - email/password auth, JWT issue/verify, auth cookie handling
- `app/services/note_repository.py`
  - saved note CRUD
- `app/services/preferences_repository.py`
  - user preference persistence
- `app/services/model_profile_repository.py`
  - encrypted model profile persistence
- `app/downloaders/`, `app/transcribers/`, `app/llm/`
  - media acquisition, transcription, summarization

Main frontend responsibilities:

- `frontend/src/pages/`
  - route pages
- `frontend/src/stores/authStore.ts`
  - cookie-auth session lifecycle
- `frontend/src/stores/noteLibraryStore.ts`
  - note library CRUD via backend API
- `frontend/src/stores/languageStore.ts`
  - language preference sync via backend API
- `frontend/src/stores/modelProfileStore.ts`
  - model profile management

More detail is in [docs/architecture.md](/Users/25772/Desktop/Project/VideoNote/docs/architecture.md).

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

### 3. Required environment variables

Backend:

- `APP_JWT_SECRET`
- `DATABASE_URL`
- `MODEL_PROFILE_ENCRYPTION_KEY`
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`
- `TRANSCRIBER_TYPE`

Frontend runtime:

- `VITE_API_BASE_URL`

For local Vite development, `VITE_API_BASE_URL` can stay empty if you proxy `/api` to the backend.

## Docker

The current Docker stack is intentionally simple:

- `postgres`
- `backend`
- `frontend`

Start everything:

```bash
docker compose up --build
```

Default ports:

- Frontend: `http://localhost:3100`
- Backend: `http://localhost:8900`
- Postgres: `postgresql://vinote:<password>@127.0.0.1:54322/vinote`

Notes:

- The backend container runs database schema initialization automatically on startup.
- Frontend runtime config is injected at container start, so you do not need a separate frontend build per environment.
- The Raspberry Pi deployment target uses this same compose stack. Supabase is no longer part of the runtime architecture.

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

## Auth Model

VINote no longer depends on Supabase for browser auth.

- `POST /api/auth/sign-up`
- `POST /api/auth/sign-in`
- `POST /api/auth/sign-out`
- `GET /api/auth/me`

The backend sets an HttpOnly cookie after sign-in or sign-up. Browser requests use `credentials: 'include'`.

Protected browser data APIs:

- `/api/notes`
- `/api/preferences`
- `/api/model-profiles`

## API Notes

Core generation endpoints remain in the FastAPI backend:

- `POST /api/generate`
- `GET /api/task/{task_id}`
- `GET /api/task/{task_id}/result`

Saved-note APIs:

- `GET /api/notes`
- `GET /api/notes/{id}`
- `POST /api/notes`
- `PATCH /api/notes/{id}`
- `DELETE /api/notes/{id}`

Preference API:

- `GET /api/preferences`
- `PATCH /api/preferences`

## Verification

Useful smoke checks:

- Backend docs: `http://127.0.0.1:8900/docs`
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

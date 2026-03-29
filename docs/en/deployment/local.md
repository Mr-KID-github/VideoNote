---
title: Local and Raspberry Pi Deployment
description: Local development, Docker runtime, and Raspberry Pi LAN deployment.
---

# Local and Raspberry Pi Deployment

## Local development

Backend:

```bash
uvicorn main:app --host 0.0.0.0 --port 8900 --reload
```

Frontend:

```bash
cd frontend
npm run dev
```

Docs site:

```bash
cd docs
npm run docs:dev
```

## Default ports

- Backend API and Swagger: `8900`
- Frontend app: `3100`
- Docs site: `3101`

## Local Docker runtime

```bash
docker compose up --build
```

This starts:

- `postgres`
- `backend`
- `frontend`
- `docs`

## Raspberry Pi deployment

Recommended order:

1. Create the root `.env` from `.env.example`
2. Create `deploy/pi/local.env` from `deploy/pi/local.env.example`
3. Run bootstrap first so Docker, Docker Compose, and the remote app directory are prepared
4. Run deploy after bootstrap completes

### Bootstrap

PowerShell:

```powershell
.\deploy\pi\bootstrap-pi.ps1
```

Bash:

```bash
./deploy/pi/bootstrap-pi.sh
```

Bootstrap will:

- install Docker Engine if it is missing
- prefer the Docker Compose plugin, with `docker-compose` as a fallback
- enable and start the Docker service
- add the target user to the `docker` group
- create the remote app directory plus `data/` and `output/`

If bootstrap reports that the user was just added to the `docker` group, open a new SSH session before the first deploy.

### Deploy

Interactive PowerShell:

```powershell
.\deploy\pi\deploy-pi-interactive.ps1
```

Interactive Bash:

```bash
./deploy/pi/deploy-pi-interactive.sh
```

Non-interactive PowerShell:

```powershell
.\deploy\pi\deploy-pi.ps1
```

Non-interactive Bash:

```bash
./deploy/pi/deploy-pi.sh
```

### Current deploy behavior

- supports both `docker compose` and `docker-compose`
- lets the interactive flow launch bootstrap directly when checks fail
- preserves `PI_REMOTE_DIR` and `PI_ENV_FILE` in `deploy/pi/local.env`
- accepts UTF-8 BOM `local.env` files created by PowerShell

## LAN notes

- When `SHARE_BASE_URL` is empty, the backend will infer a LAN share URL when possible
- Raspberry Pi helper scripts live in `deploy/pi/`
- If the frontend should point to a separate docs site, set `VITE_DOCS_BASE_URL`
- Additional operational notes are in `deploy/pi/README.md` in the repository

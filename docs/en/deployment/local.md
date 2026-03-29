---
title: Local and Raspberry Pi Deployment
description: Local development, container runtime, and Raspberry Pi deployment paths.
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

VINote supports two Pi deployment paths:

- Manual deployment from a developer machine
- Automatic deployment from GitHub Actions on a Pi self-hosted runner

### Manual deployment

Recommended order:

1. Create the root `.env` from `.env.example`
2. Create `deploy/pi/local.env` from `deploy/pi/local.env.example`
3. Run bootstrap first so Docker, Docker Compose, and the remote app directory are ready
4. Run deploy after bootstrap completes

Bootstrap:

```powershell
.\deploy\pi\bootstrap-pi.ps1
```

```bash
./deploy/pi/bootstrap-pi.sh
```

Deploy:

```powershell
.\deploy\pi\deploy-pi-interactive.ps1
```

```bash
./deploy/pi/deploy-pi-interactive.sh
```

```powershell
.\deploy\pi\deploy-pi.ps1
```

```bash
./deploy/pi/deploy-pi.sh
```

The manual path still exists as the fallback for emergency redeploys and debugging.

### Automatic deployment on `dev`

The recommended shared test-environment flow is:

- merge into `dev`
- GitHub Actions picks up the push
- the Pi self-hosted runner checks out the merged commit
- the Pi rebuilds and restarts the app locally

Workflow details:

- Workflow file: `.github/workflows/deploy-pi-dev.yml`
- Trigger: `push` to `dev` and `workflow_dispatch`
- Runner labels: `self-hosted`, `linux`, `arm`, `pi`, `vinote-test`
- GitHub Environment: `pi-test`
- Local deploy script on the runner: `deploy/pi/deploy-from-checkout.sh`

### One-time runner setup

On the Raspberry Pi:

1. Install Docker and Docker Compose
2. Install a GitHub Actions self-hosted runner under a separate directory such as `/home/zouyu/actions-runner`
3. Register it with the labels `self-hosted,linux,arm,pi,vinote-test`
4. Install the runner as a service
5. Add the runner user to the `docker` group
6. Keep the deployed app under `/home/zouyu/vinote`

Do not use the app directory as the runner work directory.

### Step-by-step setup checklist

On the Raspberry Pi:

1. Sign in with the user that should own both the runner and `/home/zouyu/vinote`.
2. Install Docker and Docker Compose if they are not already installed.
3. Create the app directory and persistent folders:

```bash
mkdir -p /home/zouyu/vinote/data /home/zouyu/vinote/output
```

4. Create a dedicated runner work directory:

```bash
mkdir -p /home/zouyu/actions-runner
cd /home/zouyu/actions-runner
```

5. In GitHub, open `Settings -> Actions -> Runners -> New self-hosted runner`.
6. Choose Linux and ARM, then copy the commands GitHub gives you.
7. Run those commands on the Pi and set the labels to:
   `self-hosted,linux,arm,pi,vinote-test`
8. Install and start the runner service:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

9. Add the runner user to the `docker` group:

```bash
sudo usermod -aG docker zouyu
```

10. Restart the runner service after the group change:

```bash
sudo ./svc.sh stop
sudo ./svc.sh start
```

Quick verification:

```bash
docker --version
docker compose version || docker-compose version
id -nG
sudo ./svc.sh status
```

### GitHub Environment `pi-test`

Configure these values in GitHub:

- Secret `PI_TEST_ENV_FILE`
  - full contents of the root `.env` for the Pi test environment
- Variable `PI_REMOTE_DIR`
  - default `/home/zouyu/vinote`
- Variable `FRONTEND_PORT`
  - default `3100`
- Variable `BACKEND_PORT`
  - default `8900`
- Variable `DOCS_PORT`
  - default `3101`

GitHub-side checklist:

1. Open `Settings -> Environments`.
2. Create `pi-test`.
3. Add secret `PI_TEST_ENV_FILE` with the full contents of the Pi `.env`.
4. Add variables `PI_REMOTE_DIR=/home/zouyu/vinote`, `FRONTEND_PORT=3100`, `BACKEND_PORT=8900`, and `DOCS_PORT=3101`.
5. Leave reviewer approval disabled if `dev` should deploy automatically after merge.
6. Confirm the `Deploy Pi Test Environment` workflow appears under the Actions tab.

### Automatic deployment behavior

The workflow:

1. checks out the triggering commit on the Pi runner
2. writes `.env` from `PI_TEST_ENV_FILE`
3. validates Docker, Docker Compose, `curl`, and docker-group membership
4. runs `deploy/pi/deploy-from-checkout.sh`
5. rebuilds and restarts the stack with `docker compose up -d --build --remove-orphans`
6. smoke-checks backend, frontend, and docs on `127.0.0.1`
7. prints `docker compose ps`
8. dumps backend/frontend/docs logs on failure

The deploy script refreshes the app directory but preserves `data/` and `output/`.

## LAN notes

- When `SHARE_BASE_URL` is empty, the backend will infer a LAN share URL when possible
- If the frontend should point to a separate docs site, set `VITE_DOCS_BASE_URL`
- Manual scripts remain the operational fallback even after automatic deployment is enabled
- More Pi-specific notes live in `deploy/pi/README.md`

# Raspberry Pi Deployment

## Recommended flow

1. Create the project root `.env` from `.env.example`.
2. Copy `deploy/pi/local.env.example` to `deploy/pi/local.env` and fill in the Pi host, user, and optional remote directory.
3. Run the bootstrap script once to prepare Docker, Docker Compose, and the remote app directory.
4. Run the deploy script.

## Bootstrap

PowerShell:

```powershell
.\deploy\pi\bootstrap-pi.ps1
```

Bash:

```bash
./deploy/pi/bootstrap-pi.sh
```

What bootstrap does:

- installs Docker Engine if it is missing
- installs Docker Compose plugin, with `docker-compose` as a fallback
- enables and starts the Docker service
- adds the target user to the `docker` group
- creates the remote app directory plus `data/` and `output/`

If bootstrap adds the user to the `docker` group, open a new SSH session before the first deployment.

## Deploy

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

## Notes

- Interactive deploy now detects both `docker compose` and `docker-compose`.
- If Docker or Docker Compose is missing, the interactive deploy flow can launch bootstrap directly.
- `deploy/pi/local.env` preserves `PI_REMOTE_DIR` and `PI_ENV_FILE` instead of overwriting them during prompts.

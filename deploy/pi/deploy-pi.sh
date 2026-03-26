#!/usr/bin/env bash
set -euo pipefail

HOST="${1:-}"
USER_NAME="${PI_USER:-pi}"
PORT="${PI_PORT:-22}"
BRANCH="${PI_BRANCH:-main}"
REPO_URL="${PI_REPO_URL:-https://github.com/Mr-KID-github/VideoNote.git}"
REMOTE_DIR="${PI_REMOTE_DIR:-/home/pi/vinote}"
ENV_FILE="${PI_ENV_FILE:-.env}"
SKIP_PUSH="${PI_SKIP_PUSH:-false}"

if [[ -z "${HOST}" ]]; then
  echo "Usage: ./deploy/pi/deploy-pi.sh <host>" >&2
  exit 1
fi

for cmd in git ssh scp; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "Missing required command: ${cmd}" >&2
    exit 1
  fi
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_PATH="${REPO_ROOT}/${ENV_FILE}"
FRONTEND_PORT_VALUE="3100"

if [[ ! -f "${ENV_PATH}" ]]; then
  echo "Env file not found: ${ENV_PATH}" >&2
  exit 1
fi

if grep -q '^FRONTEND_PORT=' "${ENV_PATH}"; then
  FRONTEND_PORT_VALUE="$(grep '^FRONTEND_PORT=' "${ENV_PATH}" | tail -n 1 | cut -d'=' -f2-)"
fi

if [[ "${SKIP_PUSH}" != "true" ]] && [[ -n "$(git -C "${REPO_ROOT}" status --short)" ]]; then
  echo "Working tree is not clean. Commit or stash local changes, or rerun with PI_SKIP_PUSH=true." >&2
  exit 1
fi

if [[ "${SKIP_PUSH}" != "true" ]]; then
  echo "Pushing branch ${BRANCH} to origin..."
  git -C "${REPO_ROOT}" push origin "${BRANCH}"
fi

REMOTE="${USER_NAME}@${HOST}"
REMOTE_ENV="/tmp/vinote.env"

echo "Uploading env file to ${REMOTE}..."
scp -P "${PORT}" "${ENV_PATH}" "${REMOTE}:${REMOTE_ENV}" >/dev/null

echo "Deploying VINote to Raspberry Pi..."
ssh -p "${PORT}" "${REMOTE}" <<EOF
set -eu

for cmd in git docker; do
  if ! command -v "\${cmd}" >/dev/null 2>&1; then
    echo "Missing required command on Raspberry Pi: \${cmd}" >&2
    exit 1
  fi
done

docker compose version >/dev/null 2>&1 || {
  echo "Missing required command on Raspberry Pi: docker compose" >&2
  exit 1
}

mkdir -p "${REMOTE_DIR}"

if [ ! -d "${REMOTE_DIR}/.git" ]; then
  git clone --branch "${BRANCH}" "${REPO_URL}" "${REMOTE_DIR}"
fi

cd "${REMOTE_DIR}"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git reset --hard "origin/${BRANCH}"
cp "${REMOTE_ENV}" .env
rm -f "${REMOTE_ENV}"

mkdir -p data output

docker compose up -d --build --remove-orphans
docker compose ps
EOF

echo
echo "Deployment finished."
if [[ "${FRONTEND_PORT_VALUE}" == "80" ]]; then
  echo "Open in LAN: http://${HOST}"
else
  echo "Open in LAN: http://${HOST}:${FRONTEND_PORT_VALUE}"
fi

#!/usr/bin/env bash
set -euo pipefail

PROXY_URL="${1:-}"
NO_PROXY_VALUE="${2:-localhost,127.0.0.1,::1,.local}"
TARGET_USER="${3:-$USER}"

if [[ -z "${PROXY_URL}" ]]; then
  echo "Usage: ./deploy/pi/configure-system-proxy.sh <proxy-url> [no-proxy] [target-user]" >&2
  exit 1
fi

sudo mkdir -p /etc/systemd/system/docker.service.d
sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf >/dev/null <<EOC
[Service]
Environment="HTTP_PROXY=${PROXY_URL}"
Environment="HTTPS_PROXY=${PROXY_URL}"
Environment="NO_PROXY=${NO_PROXY_VALUE}"
Environment="http_proxy=${PROXY_URL}"
Environment="https_proxy=${PROXY_URL}"
Environment="no_proxy=${NO_PROXY_VALUE}"
EOC

sudo tee /etc/environment >/dev/null <<EOC
HTTP_PROXY=${PROXY_URL}
HTTPS_PROXY=${PROXY_URL}
NO_PROXY=${NO_PROXY_VALUE}
http_proxy=${PROXY_URL}
https_proxy=${PROXY_URL}
no_proxy=${NO_PROXY_VALUE}
EOC

sudo tee /etc/profile.d/proxy.sh >/dev/null <<EOC
export HTTP_PROXY=${PROXY_URL}
export HTTPS_PROXY=${PROXY_URL}
export NO_PROXY=${NO_PROXY_VALUE}
export http_proxy=${PROXY_URL}
export https_proxy=${PROXY_URL}
export no_proxy=${NO_PROXY_VALUE}
EOC
sudo chmod 644 /etc/profile.d/proxy.sh

sudo tee /etc/apt/apt.conf.d/99proxy >/dev/null <<EOC
Acquire::http::Proxy "${PROXY_URL}";
Acquire::https::Proxy "${PROXY_URL}";
EOC

target_home="$(getent passwd "${TARGET_USER}" | cut -d: -f6)"
if [[ -z "${target_home}" ]]; then
  echo "Could not resolve home directory for user: ${TARGET_USER}" >&2
  exit 1
fi

mkdir -p "${target_home}/.docker"
cat > "${target_home}/.docker/config.json" <<EOC
{
  "proxies": {
    "default": {
      "httpProxy": "${PROXY_URL}",
      "httpsProxy": "${PROXY_URL}",
      "noProxy": "${NO_PROXY_VALUE}"
    }
  }
}
EOC
chown -R "${TARGET_USER}:${TARGET_USER}" "${target_home}/.docker"

sudo systemctl daemon-reload
sudo systemctl restart docker

echo "Configured system, apt, and Docker proxies for ${TARGET_USER}."

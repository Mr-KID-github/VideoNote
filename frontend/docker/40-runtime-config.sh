#!/bin/sh
set -eu

cat >/usr/share/nginx/html/runtime-config.js <<EOF
window.__VINOTE_CONFIG__ = {
  VITE_API_BASE_URL: "${VITE_API_BASE_URL:-}",
  VITE_DOCS_BASE_URL: "${VITE_DOCS_BASE_URL:-}"
};
EOF

#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI was not found. Install it first: https://supabase.com/docs/guides/cli" >&2
  exit 1
fi

cd "${REPO_ROOT}"

echo "Starting local Supabase stack..."
supabase start

echo "Applying local migrations..."
supabase db push

echo "Current local status:"
supabase status

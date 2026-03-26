#!/bin/sh
set -eu

export PGPASSWORD="${POSTGRES_PASSWORD}"

until pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U postgres >/dev/null 2>&1; do
  echo "Waiting for Supabase Postgres..."
  sleep 2
done

for file in \
  /bootstrap/roles.sql \
  /bootstrap/jwt.sql \
  /app-migrations/*.sql
do
  echo "Applying ${file}"
  psql -v ON_ERROR_STOP=1 \
    -h "${POSTGRES_HOST}" \
    -p "${POSTGRES_PORT}" \
    -U postgres \
    -d "${POSTGRES_DB}" \
    -f "${file}"
done

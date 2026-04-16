#!/bin/sh
set -e

echo "[start] waiting for postgres ..."
until pg_isready -h postgres -U "${POSTGRES_USER:-synweb}" -d "${POSTGRES_DB:-synweb}" -q; do
  sleep 1
done
echo "[start] postgres ready"

echo "[start] running migrations ..."
node --import tsx scripts/migrate.ts

echo "[start] seeding admin (idempotent) ..."
node --import tsx scripts/seed.ts

echo "[start] launching next"
exec node server.js

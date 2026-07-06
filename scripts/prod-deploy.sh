#!/usr/bin/env bash
# App-Deploy auf syn-prod-1 (PROD seit Umzug 06.07.2026). Laeuft AUF syn-prod-1.
# Voraussetzung: Aenderung auf DEV getestet UND auf main gepusht.
set -euo pipefail
cd /root/synweb
echo "==> Pull main"
git fetch origin && git checkout main && git reset --hard origin/main
echo "==> Build prod-app image"
docker compose --env-file .env.prod -f docker-compose.prod.yml build app
echo "==> Recreate prod-app (DB+Redis unangetastet)"
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --force-recreate app
sleep 8
docker logs synweb-prod-app --tail 20
echo "==> Smoke:"
echo "   home  $(curl -sS -o /dev/null -w %{http_code} https://asksyn.com/)"
echo "   gate  $(curl -sS -o /dev/null -w %{http_code} https://app.asksyn.com/app/dashboard)"

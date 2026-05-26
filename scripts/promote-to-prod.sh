#!/usr/bin/env bash
# Promote current code (was auf main / im Working-Tree liegt) zur Produktion.
# Macht Folgendes:
#   1. Verifiziert dass das Image fuer dev gebaut wurde (rebuild ist optional)
#   2. Baut das prod-Image aus dem gleichen Source-Tree
#   3. Restartet den prod-app-Container (keine Datenbank/Redis-Aenderung)
#   4. Zeigt die Logs der ersten 10 Sekunden nach Restart
#
# Vorbedingung: dev-Stack laeuft und ist getestet (syn.worqshop.io).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Build prod-app image from current source"
docker compose --env-file .env.prod -f docker-compose.prod.yml build app

echo "==> Sync shared brand assets (_admin: landing images + Syn avatar) dev -> prod"
# uploads is a per-env volume (dev ./uploads, prod ./uploads_prod). Session files
# stay separate, but the shared _admin brand assets (landing product/persona images,
# Syn avatar) must be carried over or the live landing shows stale/broken images.
mkdir -p ./uploads_prod/_admin/landing
cp -f ./uploads/_admin/landing/*.png ./uploads_prod/_admin/landing/ 2>/dev/null || true
cp -f ./uploads/_admin/syn-avatar.png ./uploads_prod/_admin/syn-avatar.png 2>/dev/null || true

echo "==> Recreate prod-app container (DB+Redis bleiben unangefasst)"
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --force-recreate app

echo "==> Wait 6s, then show boot log"
sleep 6
docker logs synweb-prod-app --tail 25

echo ""
echo "==> Promote done. Smoke test:"
echo "   curl -sS -o /dev/null -w 'HTTP %{http_code}\n' https://asksyn.com/"

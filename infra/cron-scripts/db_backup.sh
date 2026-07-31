#!/bin/bash
# Taegliche DB-Dumps fuer synweb DEV (PROD auf syn-prod-1 umgezogen 06.07.2026). Rotation: 14 Tage.
set -e
D=/root/synweb/backups/db
TS=$(date +%F)
docker exec synweb-postgres pg_dump -U synweb -d synweb | gzip > "$D/synweb-dev-$TS.sql.gz"
find "$D" -name "*.sql.gz" -mtime +14 -delete

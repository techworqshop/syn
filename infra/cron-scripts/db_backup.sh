#!/bin/bash
# Taegliche DB-Dumps fuer synweb DEV+PROD. Rotation: 14 Tage.
set -e
D=/root/synweb/backups/db
TS=$(date +%F)
docker exec synweb-postgres pg_dump -U synweb -d synweb | gzip > "$D/synweb-dev-$TS.sql.gz"
docker exec synweb-prod-postgres pg_dump -U synweb_prod -d synweb_prod | gzip > "$D/synweb-prod-$TS.sql.gz"
find "$D" -name "*.sql.gz" -mtime +14 -delete

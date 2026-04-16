#!/bin/bash
# Weekly VACUUM ANALYZE on the SynWeb Postgres DB
LOG=/var/log/synweb_postgres_vacuum.log
echo "$(date): vacuum started" >> "$LOG"
cd /root/synweb && docker compose exec -T postgres vacuumdb --analyze --username=synweb --dbname=synweb >> "$LOG" 2>&1
echo "$(date): vacuum finished" >> "$LOG"

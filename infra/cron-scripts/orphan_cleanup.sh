#!/bin/bash
# Weekly: delete upload/persona/report dirs for sessions that no longer exist in DB.
# Safety net — primary cleanup happens in the session DELETE endpoint.
LOG=/var/log/synweb_orphan_cleanup.log
echo "$(date): orphan cleanup started" >> "$LOG"

# Get live session IDs from DB
IDS=$(docker exec synweb-postgres psql -U synweb -d synweb -t -A -c "SELECT id FROM sessions;" 2>>"$LOG")
if [ -z "$IDS" ]; then
  echo "$(date): could not read session IDs, skipping" >> "$LOG"
  exit 1
fi
TMPFILE=$(mktemp)
echo "$IDS" | sort > "$TMPFILE"

# Clean orphan dirs under each root
for ROOT in /root/synweb/uploads /root/synweb/uploads/personas /root/synweb/uploads/reports; do
  [ -d "$ROOT" ] || continue
  for DIR in "$ROOT"/*/; do
    [ -d "$DIR" ] || continue
    NAME=$(basename "$DIR")
    # skip special dirs
    case "$NAME" in _admin|personas|reports) continue ;; esac
    if ! grep -qx "$NAME" "$TMPFILE"; then
      rm -rf "$DIR"
      echo "$(date): removed orphan $DIR" >> "$LOG"
    fi
  done
done
rm -f "$TMPFILE"
echo "$(date): orphan cleanup finished" >> "$LOG"

#!/bin/bash
# Daily: delete ephemeral user-uploaded files older than 7 days.
# Skips reports/ and personas/ dirs — those have their own lifecycle scripts.
LOG=/var/log/synweb_uploads_cleanup.log
echo "$(date): uploads cleanup started" >> "$LOG"
find /root/synweb/uploads -type f -mtime +7 \
  -not -path '*/reports/*' \
  -not -path '*/personas/*' \
  -not -path '*/_admin/*' \
  -delete >> "$LOG" 2>&1
echo "$(date): uploads cleanup finished" >> "$LOG"

#!/bin/bash
# Delete uploaded files older than 7 days
LOG=/var/log/synweb_uploads_cleanup.log
echo "$(date): uploads cleanup started" >> "$LOG"
find /root/synweb/uploads -type f -mtime +7 -delete >> "$LOG" 2>&1
echo "$(date): uploads cleanup finished" >> "$LOG"

#!/bin/bash
# Monthly: delete Abschlussbericht PDFs older than 30 days
# Files live under /root/synweb/uploads/reports/<sessionId>/<reportId>.pdf
LOG=/var/log/synweb_reports_cleanup.log
echo "$(date): reports cleanup started" >> "$LOG"
find /root/synweb/uploads/reports -type f -name '*.pdf' -mtime +30 -delete >> "$LOG" 2>&1
# Remove empty session-dirs left behind
find /root/synweb/uploads/reports -mindepth 1 -type d -empty -delete >> "$LOG" 2>&1
echo "$(date): reports cleanup finished" >> "$LOG"

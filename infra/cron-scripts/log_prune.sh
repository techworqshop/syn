#!/bin/bash
# Monthly: truncate SynWeb logs older than 30 days
find /var/log -maxdepth 1 -name 'synweb_*.log' -mtime +30 -exec truncate -s 0 {} \;

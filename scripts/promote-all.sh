#!/usr/bin/env bash
# promote-all.sh — Übertrag: Dev → Prod
#
# 1) Promotet die App (Container-Code aus aktuellem Source-Tree)
# 2) Promotet alle 15 SynWeb_*-Workflows von Dev nach Prod
#    (Dev-Versionen werden exportiert, transformiert, ueber die
#     existierenden Prod-Workflows reimportiert)
#
# Voraussetzungen:
# - Dev (syn.worqshop.io) ist gebaut + getestet
# - Workflow-Mapping liegt unter /tmp/wfsplit/dev_to_prod_mapping.json
#   (wird beim Initial-Setup angelegt; ohne Mapping fail-fast).
#
# Verwendung: /root/synweb/scripts/promote-all.sh
set -euo pipefail
cd "$(dirname "$0")/.."

MAPPING="/tmp/wfsplit/dev_to_prod_mapping.json"
if [ ! -f "$MAPPING" ]; then
  echo "✗ Mapping not found at $MAPPING. Run setup first."
  exit 1
fi

echo "============================================================"
echo "PHASE 1 — App (Container) promote"
echo "============================================================"
/root/synweb/scripts/promote-to-prod.sh

echo ""
echo "============================================================"
echo "PHASE 2 — Workflows promote (Dev → Prod, 15 workflows)"
echo "============================================================"
python3 /root/synweb/scripts/promote-workflows-to-prod.py

echo ""
echo "============================================================"
echo "Übertrag fertig. Smoke-Tests:"
echo "============================================================"
echo "  curl -sS -o /dev/null -w 'HTTP %{http_code}\n' https://asksyn.com/"
echo "  curl -sS -X POST -H 'Content-Type: application/json' -d '{}' https://n8n.worqshop.io/webhook/synweb/inbound-prod"

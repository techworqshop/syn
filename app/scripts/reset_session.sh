#!/usr/bin/env bash
# Reset einer Session konsistent ueber BEIDE DBs (synweb-postgres + n8n-postgres).
#
# Hintergrund: SynWeb-State liegt in 2 Postgres-Instanzen:
#   - synweb-postgres: sessions, messages, files, persona_images (App-DB)
#   - n8n-postgres-1: panel_sessions, panel_personas, panel_syntheses, panel_files
#                     UND n8n_chat_histories (Coordinator-Memory)
#
# Wenn nur eine Seite resettet wird, sieht der Coordinator z.B. via "Read Sessions"
# noch current_round=1 obwohl die App-DB schon 0 zeigt -> Bug wie am 2026-05-26.
#
# Usage:  ./reset_session.sh <SESSION_ID>
#
# Was passiert:
#   1. synweb.sessions: status='ready', current_round=0
#   2. synweb.messages: alle role!='user' messages der Session loeschen
#                       (User-Bubbles bleiben, AI-Output weg)
#   3. n8n.panel_sessions: status='ready', current_round=0
#   4. n8n.panel_personas: round_1_response/round_2_response/round_3_response = NULL
#   5. n8n.panel_personas: alle Rows mit status='proposed' loeschen (Karteileichen)
#   6. n8n.panel_syntheses: alle Rows der Session loeschen
#   7. n8n.n8n_chat_histories: Memory der Session loeschen (Coordinator + Audience)
#
# Nicht angefasst: files, persona_images (sollen erhalten bleiben).

set -euo pipefail

SESSION_ID="${1:-}"
if [ -z "$SESSION_ID" ]; then
  echo "Usage: $0 <session_id>"
  exit 1
fi

# Quick UUID-Check
if ! [[ "$SESSION_ID" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
  echo "ERROR: '$SESSION_ID' looks not like a UUID"
  exit 1
fi

# Datatable-IDs sind statisch - aus n8n's data_table-Tabelle gepinned:
PANEL_PERSONAS_TABLE="data_table_user_oAfVlk69fSh57ABR"
PANEL_SESSIONS_TABLE="data_table_user_qD96RyJnIvC13H1R"
PANEL_SYNTHESES_TABLE="data_table_user_gWtiMitQibIBiFeE"

echo "==> Reset Session $SESSION_ID"
echo

# 1+2: synweb-postgres
echo "[1/3] App-DB (synweb-postgres) ..."
docker exec -i synweb-postgres psql -U synweb -d synweb <<SQL
UPDATE sessions SET status='ready', current_round=0 WHERE id='$SESSION_ID';
DELETE FROM messages WHERE session_id='$SESSION_ID' AND role != 'user';
SELECT 'sessions' AS t, status, current_round FROM sessions WHERE id='$SESSION_ID'
UNION ALL
SELECT 'msg_remaining' AS t, role, COUNT(*)::text FROM messages WHERE session_id='$SESSION_ID' GROUP BY role;
SQL

# 3-6: n8n-postgres-1 (panel_*)
echo "[2/3] Panel-DB (n8n-postgres-1) ..."
docker exec -i n8n-postgres-1 psql -U n8n -d n8n <<SQL
UPDATE "$PANEL_SESSIONS_TABLE" SET status='ready', current_round=0 WHERE session_id='$SESSION_ID';
UPDATE "$PANEL_PERSONAS_TABLE" SET round_1_response=NULL, round_2_response=NULL, round_3_response=NULL WHERE session_id='$SESSION_ID';
DELETE FROM "$PANEL_PERSONAS_TABLE" WHERE session_id='$SESSION_ID' AND status='proposed';
DELETE FROM "$PANEL_SYNTHESES_TABLE" WHERE session_id='$SESSION_ID';
SELECT 'panel_personas' AS t, persona_id, status FROM "$PANEL_PERSONAS_TABLE" WHERE session_id='$SESSION_ID' ORDER BY slack_slot;
SQL

# 7: Coordinator + Audience Memory
echo "[3/3] Coordinator/Audience Memory (n8n_chat_histories) ..."
docker exec -i n8n-postgres-1 psql -U n8n -d n8n <<SQL
DELETE FROM n8n_chat_histories WHERE session_id LIKE '%$SESSION_ID%';
SELECT 'memory_remaining' AS t, COUNT(*) FROM n8n_chat_histories WHERE session_id LIKE '%$SESSION_ID%';
SQL

echo
echo "==> Done. Coordinator startet die naechste Nachricht clean - kein stale current_round, kein stale chat-memory."

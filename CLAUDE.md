# SynWeb — Projekt-Kontext für Claude Code

Das ist der persistente Kontext-Layer. Dieser File wird von Claude Code
automatisch eingelesen. Halt ihn aktuell wenn sich Grundlegendes ändert.

## Was ist SynWeb

Web-App (Next.js 15 + Postgres + Redis) als Frontend für das bestehende
Syn-Fokusgruppen-System. Ersetzt Slack als Interface. Läuft parallel zur
Slack-Variante — die bleibt unverändert.

- **Live-URL**: https://syn.worqshop.io
- **Repo**: https://github.com/techworqshop/syn
- **Host**: Self-hosted auf worqshop Server (`128.140.8.255`, Ubuntu 24.04)
- **Admin-Login**: tech@worqshop.io (Passwort beim User)

## Wichtige URLs + IDs

### Web App Routes

- `/` redirect to login or dashboard
- `/login` — Credentials auth via NextAuth v5
- `/app/dashboard` — Session-Liste + Neue-Fokusgruppe-Button
- `/app/sessions/[id]` — Chat-View
- `/app/users` — User-Verwaltung (admin only)
- `/share/[token]` — Public read-only view
- `/invite/[token]` — Public registration
- API: `/api/sessions`, `/api/n8n/callback`, `/api/invites`, `/api/users`, etc.

### n8n SynWeb-Workflow-IDs

| Workflow | ID | Zweck |
|---|---|---|
| SynWeb_Gateway | V0CpwraeTYxQh6BM | Webhook-Entry, routing |
| SynWeb_Coordinator | A3jxDuimyDE2G6uO | AI-Agent (Sonnet), Phase 0/1/2+ |
| SynWeb_RunPersona | XybiSig1oi3HquZd | Per-Persona Runde mit File-Attach |
| SynWeb_Audience | M04sAqjOhZRVGlXb | 1:1 Interviews mit File-Attach |
| SynWeb_Synthesize | xgBgCZeVWBVB7jLN | Round-Synthese mit File-Attach |
| SynWeb_ReadState | Iu9BXYdydQueQC41 | DataTable-Read |
| SynWeb_IngestFile | oFGYiNFs7B1At0n0 | File-Analyse (Haiku) -> panel_files |
| SynWeb_DeleteFile | 8YMfBODhPVGNYNpq | panel_files Row löschen |
| SynWeb_SendInvite | 43KZPaaRtfchFZ8h | Invite-Mail via Gmail (tech@worqshop.io) |
| SynWeb_PostStatus | 6GNn5cZdVZyGoxR1 | Progress-Indikator (kind=status, ephemer) |
| SynWeb_UpdatePersona | DPGRWxdL6qyAEd6i | Per-Persona Rigidity-Update via Postgres |
| SynWeb_FinalReport | vJ1K27VranwixXK1 | Abschlussbericht (Opus 4.7) |

**Slack-Seite unangetastet** — die 11 Syn_*/Alpha_*/etc. Workflows nicht modifizieren.

## Server-Layout

- `/root/synweb/` — Projekt-Root (alles SynWeb-Zeug)
  - `app/` — Next.js Source
  - `infra/synweb-workflows/` — n8n-Workflow-JSONs (Backup + Import)
  - `infra/Caddyfile.synweb` — Reverse-Proxy-Config-Fragment
  - `infra/synweb-cleanup.cron` — Cleanup-Cron-Definition
  - `backups/workflows-2026-04-16/` — Original Syn-Workflow-JSONs (Rollback)
  - `uploads/` — User-Files + Persona-Images + `_admin/syn-avatar.png`
  - `docker-compose.yml` — eigener Stack (postgres+redis+app)
  - `.env` — Secrets (NICHT committen)

- `/root/n8n/` — bestehender n8n-Stack (NICHT ANFASSEN)

## Docker-Container

- `synweb-app` — Next.js (Port 3100 intern)
- `synweb-postgres` — Postgres 16 (isoliert, own DB "synweb")
- `synweb-redis` — Pub/Sub für SSE
- `n8n-*` — separater n8n-Stack

## Tech Stack

- Next.js 15 App Router + Server Components
- NextAuth v5 Credentials (bcrypt)
- Drizzle ORM + postgres-js
- Tailwind v3 + custom .btn-primary (violet->fuchsia->rose)
- ioredis (Pub/Sub for SSE)
- pdfkit (PDF-Export)
- Glass morphism + mesh gradient background
- Gemini 2.5 Flash Image (persona portraits, syn-avatar)
- Claude Sonnet 4.5 + Haiku (n8n Anthropic node, credential ID xryPDagnAi6vifng)
- Gmail OAuth (credential ID zHsOQgsahwMpHDy9, Tech account)

## DB-Schema (synweb-Postgres)

- `users` (id, email, password_hash, name, is_admin, must_change_password)
- `invites` (id, email, token, invited_by, used_at, expires_at)
- `sessions` (id, user_id, title, title_locked, problem_brief, status, rigidity_score, persona_count, current_round, share_token)
- `messages` (id, session_id, role, persona_slot, persona_name, content, round_number, metadata)
- `audience_messages` (id, session_id, persona_slot, role, content)
- `files` (id, session_id, file_name, mime_type, storage_path, summary, size_bytes, category)
- `syntheses` (id, session_id, round_number, synthesis_text)
- `persona_images` (id, session_id, slot, storage_path, mime_type, status)

n8n-DataTables (panel_sessions, panel_personas, panel_syntheses, panel_files) leben im n8n-Postgres, NICHT synweb-Postgres. Sie sind Source-of-Truth für Panel-Inhalte. SynWeb spiegelt nur für UI.

## Datenfluss

1. User schreibt im Web → `POST /api/sessions/[id]/message`
2. Webapp forwarded an `SynWeb_Gateway` Webhook
3. Gateway routed an `SynWeb_Coordinator` (oder `SynWeb_Audience` wenn targetPersona gesetzt)
4. n8n-Agent macht seinen Kram, ruft Sub-Workflows (RunPersona, Synthesize) via Tool-Use
5. Jeder Output landet via HTTP-Callback bei `/api/n8n/callback`
6. Callback writes to messages/audience_messages + publishes Redis
7. Browser SSE auf `/api/sessions/[id]/stream` kriegt Events

## Common Commands

```bash
# Rebuild + restart app
cd /root/synweb && docker compose build app && docker compose up -d --force-recreate app

# Watch app logs
docker logs -f synweb-app

# Postgres shell (synweb DB)
docker exec -it synweb-postgres psql -U synweb -d synweb

# Postgres shell (n8n DB, für panel_*)
docker exec -it n8n-postgres-1 psql -U n8n -d n8n

# Import workflow to n8n
docker cp /root/synweb/infra/synweb-workflows/X.json n8n-n8n-web-1:/tmp/x.json
docker exec n8n-n8n-web-1 n8n import:workflow --input=/tmp/x.json

# Export workflow from n8n
docker exec n8n-n8n-web-1 n8n export:workflow --id=<ID> --pretty --output=/tmp/x.json
docker cp n8n-n8n-web-1:/tmp/x.json /root/synweb/infra/synweb-workflows/X.json

# Caddy reload nach Config-Änderung
systemctl reload caddy
```

## Konventionen / Wichtige Regeln

- **Slack-Workflows NICHT anfassen**. Original-JSON-Backups liegen unter `backups/workflows-2026-04-16/`
- **DB-Migrations** sind idempotente SQL-Files in `app/drizzle/000X_*.sql`, werden beim Container-Start automatisch angewendet (scripts/migrate.ts liest alle *.sql in ASC-Order)
- **Secrets** liegen NUR in `/root/synweb/.env` — nie committen. `.env.example` ist die Template-Referenz.
- **Persona-Avatare**: Slot 1 rose, 2 amber, 3 emerald, 4 violet, 5 sky (konsistent in PersonaSidebar, MessageBubble, PersonaAvatar)
- **Coordinator-Prompt**: Zwingt realistische Fantasy-Namen (NICHT Alpha/Beta). Siehe SynWeb_Coordinator systemMessage.
- **Auto-Admin**: Alle @worqshop.io Mails werden beim Invite-Accept automatisch Admin.
- **Commands im Chat dürfen 1000 chars nicht überschreiten** (SSH MCP Limit)
- **Nach jedem Workflow-Import** muss er über `n8n_update_partial_workflow` aktiviert werden

## Offene Punkte

- File-Attach live-testen: Pipeline steht, aber ob Personas wirklich Content statt nur Summary sehen, noch nicht empirisch verifiziert.
- Admin-Toggle UI fehlt (aktuell nur SQL oder automatisch bei @worqshop.io).
- Password-Reset nicht implementiert.
- GitHub PAT wurde im Chat gepostet, in /root/.git-credentials — Rotation empfohlen.

## Wie ich in neuen Sessions arbeite

1. Diesen File lesen.
2. Code liegt remote in /root/synweb/ — via `mcp__mcpsrv_n8n_server__exec` erreichbar.
3. Lokales Arbeitsverzeichnis beim User = Windows; alles Server-seitig über SSH MCP.
4. Änderungen commit + push auf main (techworqshop/syn).
5. Nach Code-Änderung: `cd /root/synweb && docker compose build app && docker compose up -d --force-recreate app`.
6. Status-Check: `docker ps`, `docker logs synweb-app`, `curl https://syn.worqshop.io/...`.

## Meilenstein-Historie

- Phase 0: Workflow-Backups, Repo-Init
- Phase 1: Auth, Next.js-Skeleton, erste SynWeb_*-Workflows, Caddy-Routing
- Phase 2a-d: Persona-Details, File-Kategorien, Fantasy-Namen, UI-Polish, Mesh-Gradient
- Phase 2e-f: Layout-Fix, Avatar, Auto-Title, Delete/Duplicate/Share/Export
- Phase 2g-h: PDF-Export, Synthese mit Files, Gemini Persona-Images
- Phase 2i: Invite-System, Admin-Gating, Auto-Admin, User-Kick

## Typische Git-Commit-Identität

`Worqshop Tech <tech@worqshop.io>` — bereits in `/root/synweb/.git/config` gesetzt.

## Co-Author (Claude)

Claude Code signiert Commits nicht automatisch. Wenn gewünscht, manuell `Co-Authored-By: Claude` an Commit-Messages anhängen.

## Phase 2l+2m (auto-appended)

New API: PATCH /api/sessions/[id]/personas/[slot] (rigidity), POST /api/sessions/[id]/final-report, GET /api/reports/[sessionId]/[reportId]

DB: panel_personas.rigidity (double, default 5, NOT NULL); Message-metadata kinds: error, report_status, report (mit reportId+filename), report_error

Model-Stack (04-2026): Coordinator/RunPersona/Audience/FinalReport=Opus 4.7, Synthesize=Sonnet 4.6, IngestFile=Haiku. temperature-param weg (Opus 4.7 deprecated).

Volle Details siehe docs/JOURNEY.md Phase 2l+2m.

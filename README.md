# SynWeb

Web frontend for the Syn multi-agent focus group system.

Parallel channel to the existing Slack-based Syn workflows. Shares the same
n8n DataTables (`panel_sessions`, `panel_personas`, `panel_syntheses`, `panel_files`)
but uses its own n8n workflow family (`Syn_Web_*`) and its own database for
user accounts and sessions (`synweb` on the shared Postgres instance).

## Layout

```
app/        Next.js 15 (App Router) frontend + BFF API routes
infra/      Docker Compose, Caddy snippet, cleanup cron
uploads/    Runtime: user-uploaded files (gitignored, 7-day retention)
backups/    n8n workflow exports for rollback
```

## Status

Phase 0 - Backups taken 2026-04-16. App scaffold pending.

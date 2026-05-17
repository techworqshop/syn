# Deployment — Dev + Prod Stacks

SynWeb läuft als **zwei isolierte Docker-Compose-Stacks** auf dem gleichen
Server. Code-Source ist geteilt, alles andere ist getrennt: eigene DBs,
eigene Redis-Instanzen, eigene Uploads-Volumes, eigene Secrets, eigene
User-Accounts.

## Stacks im Überblick

| Stack | Domain | Compose-Datei | Env-Datei | Container | Port | DB-Volume |
|---|---|---|---|---|---|---|
| **Dev** | `syn.worqshop.io` | `docker-compose.yml` | `.env` | `synweb-app` / `synweb-postgres` / `synweb-redis` | `127.0.0.1:3100` | `./pg_data` |
| **Prod** | `asksyn.com` (+ www, app) | `docker-compose.prod.yml` | `.env.prod` | `synweb-prod-app` / `synweb-prod-postgres` / `synweb-prod-redis` | `127.0.0.1:3200` | `./pg_data_prod` |

`asksyn.de/.org/.store` redirecten weiterhin via Caddy auf `asksyn.com`.

Beide Stacks teilen sich:
- **Code-Tree** unter `./app/` — gleiche Source, getrennte Images.
- **n8n-Workflows** (auf `n8n_default` Network) — synWeb_Gateway etc.
  rufen über die Webhook-Payload zurück, kommen also automatisch auf
  den richtigen Stack zurück.

## Workflow

### Normale Code-Änderung (Dev)

```bash
# Quelle ändern (push), dann:
cd /root/synweb
docker compose build app && docker compose up -d --force-recreate app
# Test: https://syn.worqshop.io/
```

Prod bleibt unangefasst.

### Promote zu Prod

Wenn Dev getestet und stabil ist:

```bash
/root/synweb/scripts/promote-to-prod.sh
# Test: https://asksyn.com/
```

Das Script baut das Prod-App-Image aus dem aktuellen Source-Tree und
restartet **nur** den `synweb-prod-app` Container. DB + Redis bleiben
unangefasst, alle existierenden Prod-User behalten ihre Daten.

### Logs

```bash
docker logs -f synweb-app           # Dev
docker logs -f synweb-prod-app      # Prod
```

### Postgres-Shell

```bash
docker exec -it synweb-postgres      psql -U synweb       -d synweb        # Dev
docker exec -it synweb-prod-postgres psql -U synweb_prod  -d synweb_prod   # Prod
```

## Erstmaliges Hochfahren von Prod (bereits passiert)

1. `./scripts/gen-prod-env.sh` → erzeugt `.env.prod` mit frischen
   Secrets (POSTGRES_PASSWORD + NEXTAUTH_SECRET) und kopiert die
   "shared" Felder (n8n-Webhooks, Gemini-API-Key) aus `.env`.
2. `cp -r uploads/_admin uploads_prod/_admin` → Logo + Landing-Bilder
   sind sofort verfügbar.
3. `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d`
   → frische DB, Migrations 0000-0011 laufen, `tech@worqshop.io` wird
   als Admin geseedet.

**Wichtig:** Beim Aufruf von `docker compose -f docker-compose.prod.yml ...`
**immer** `--env-file .env.prod` mitgeben. Sonst zieht Compose die
Variablen aus dem default `.env` (= Dev-Werte), und Postgres würde mit
falschen Credentials initialisiert.

Das Promote-Script setzt das Flag bereits.

## Caddy-Routing

`/etc/caddy/Caddyfile`:

```
syn.worqshop.io {
    reverse_proxy 127.0.0.1:3100    # → Dev
}

asksyn.com, www.asksyn.com, app.asksyn.com {
    reverse_proxy 127.0.0.1:3200    # → Prod
}

asksyn.de, www.asksyn.de, asksyn.org, www.asksyn.org, asksyn.store, www.asksyn.store {
    redir https://asksyn.com{uri} 301
}
```

Nach Änderungen: `systemctl reload caddy`.

## Account-Trennung

- Dev und Prod haben **getrennte User-Tabellen**. Ein Login auf Dev
  bringt dir keinen Zugriff auf Prod (anderer JWT-Secret).
- Beide Stacks haben einen geseedeten Admin `tech@worqshop.io` mit
  dem selben Initial-Passwort (aus `.env` bzw. `.env.prod`), aber das
  sind **zwei verschiedene Accounts** in zwei verschiedenen Datenbanken.
- Sign-up ist auf beiden Stacks aktuell auf `@worqshop.io` Mitarbeiter
  beschränkt (Beta-Gate in `register/actions.ts`).

## Was NICHT geteilt wird

- Files / Uploads: jede Instanz hat ihr eigenes `./uploads*/`
- Persona-Images: pro Stack neu generiert
- Sessions, Berichte, Personas: pro-Stack isoliert
- Redis-Pub/Sub: jeder Stack hat eigenen Redis (kein Cross-Stack-SSE)

## Was geteilt wird

- n8n-Workflows (eine zentrale n8n-Instanz)
- Domain DNS (United Domains)
- Caddy als Reverse-Proxy
- Gemini- + Anthropic-Credentials in n8n

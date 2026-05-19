# Syn — Roadmap

Living document. Stand: 18. Mai 2026. Prioritäten in absteigender Reihenfolge innerhalb jeder Tier.

---

## 🚨 Tier 0 — Bevor Public-Launch

### Payment & Billing
- **Chargebee-Integration** (Phase 0-3 wie in der vorherigen Nachricht skizziert)
  - User legt Chargebee-Site + Stripe-Anbindung an
  - User schickt mir API-Key + Plan-IDs + Webhook-Secret
  - Ich: `npm install chargebee`, `lib/chargebee.ts`, Migration 0015 für `subscriptions`-Table, Server-Action `createCheckoutSession`, `/api/chargebee/webhook` Handler, `/billing` mit echten Daten, Customer-Portal-Integration
  - Test-Mode-Durchlauf gemeinsam, dann Live-Mode + erster Test-Kauf

### Cookie-Banner
- DSGVO grenzwertig ohne (auch mit nur Session-Cookies eigentlich nötig)
- Library: `cookieyes` oder `cookiebot` (kostenfrei für kleine Sites), oder selber bauen
- Schaut nur die ersten 2 Buttons (Accept all / Essential only) — Konfiguration in Settings
- Aufwand: ~2-3h

### Verbleibende Sub-Workflow-Callbacks fixen
- 5 Workflows haben weiter hartkodierte `syn.worqshop.io` Callback-URLs:
  - SynWeb_RunPersona
  - SynWeb_Synthesize
  - SynWeb_RunRound
  - SynWeb_PostStatus
  - SynWeb_FinalReport
- Wenn User auf Prod über Phase 0 hinausgeht, schlagen Persona-Antworten + Synthesen + Final-Report fehl
- Aufwand: ~1h (jeder Sub-Workflow's Web-Callback URL dynamisch + Coordinator's toolWorkflow-Inputs erweitern)

---

## 🟡 Tier 1 — Sehr empfohlen vor Skalierung

### Dev/Prod-Workflow-Split (n8n)
- Aktuell teilen Dev + Prod dieselben Workflows
- Plan: 8 Workflows klonen mit `_prod` Suffix, getrennte Webhook-Pfade
- `scripts/promote-workflows-to-prod.sh` bauen
- Tags `env:dev` / `env:prod` in n8n
- Aufwand: ~2h einmalig
- **Begründung:** Workflow-Änderungen lassen sich nicht mehr unkontrolliert auf Prod ausrollen

### Security (Phase 3 — Hardening)
Sammlung der nicht-kritischen Sicherheitsverbesserungen die aus der OWASP-Audit-Phase noch offen sind:

- **CSP-Nonce-based** — `'unsafe-inline'` aus `script-src` rausnehmen via Next.js Middleware. Aufwand: ~2-3h. Schützt deutlich besser gegen XSS.
- **Sentry / Error-Tracking** — Wir haben strukturiertes Logging + Audit-Trail, aber kein zentrales Aggregation/Alerting. User signt up bei sentry.io, gibt DSN, ich wire-up (~30 Min).
- **MIME-Whitelist beim File-Upload** — Aktuell alle Dateitypen erlaubt. Whitelist `[pdf, png, jpg, webp, txt, md, csv, json]` + Content-Type-Check serverseitig. Aufwand: 30 Min.
- **Anti-Enum auf `/register`** — Aktuell „Email bereits registriert" leakt Account-Existenz. Auf generische „Wir haben dir einen Link geschickt"-Response umstellen wie bei `/forgot-password`. Aufwand: 15 Min.
- **Penetration-Test der Auth-Flows** — XSS, CSRF, JWT-Tampering, Session-Fixation. Manuell. ~1-2h.
- **HSTS Preload submission** — Sobald Site 4+ Wochen stabil läuft, bei [hstspreload.org](https://hstspreload.org) einreichen.
- **CAPTCHA auf Register/Login** — Erst relevant wenn echte Bots auftauchen. Cloudflare Turnstile (gratis, datenschutzfreundlich) oder hCaptcha.
- **JWT-Secret-Rotation-Plan** — Quartals-Rotation dokumentieren + ablaufen lassen.
- **Persona-Image Share-Token-Path** — `/api/persona-images/[sessionId]/[slot]` akzeptiert `?share=TOKEN`. Aber `PersonaAvatar`-Component übergibt das nicht beim Render auf Share-Page. Aktuell kein Breakage weil Share-Page PersonaAvatar nicht nutzt, aber wenn man es später nutzen will: Component erweitern.

### Account-Lifecycle
- **Email-Change-Flow** ✓ (gebaut, in Settings)
- **Account-Deletion** ✓ (grace-period, manuelle Reaktivierung)
- **Account-Settings UI-Polish** — Aktuell solide aber 4 sehr ähnliche Section-Cards untereinander. Tab-Layout / Side-Nav wäre eleganter. Optional.
- **Password-Strength-Indicator** beim Register/Reset — visuelle Stärke-Anzeige. Optional.

---

## 🟢 Tier 2 — Marketing-Tiefe + Content

### Content-Pages
- **`/pricing`** — dedizierte Seite (aktuell nur `/#pricing` Anker auf Landing). Mit FAQ, Feature-Matrix, Vergleichstabelle.
- **`/about`** — „Wer ist Worqshop, warum Syn"
- **`/contact`** — Mailto + optional Form
- **`/help`** — aktuell 5 Schritte, kann ausgebaut werden: „Wie schreibe ich ein gutes Briefing?", „Wie steuere ich Rigidity?", „Was machen die einzelnen Phase-Schritte?"
- **`/blog`** oder `/changelog` — SEO + Vertrauen

### Onboarding
- **First-Login Tour** — Modal das durch das Dashboard führt (Tooltip-basiert, z.B. via `react-joyride`)
- **Sample-Session** — Eine Beispiel-Session vor-deployen mit dem User's Account beim Onboarding („So sieht ein fertiges Panel aus")
- **Email-Sequence nach Sign-up** — Day 1: Welcome, Day 3: „Wie war dein erstes Panel?", Day 7: „Brauchst du Hilfe?"

### Use-Case-Detail-Pages
- `/use-cases/products`, `/use-cases/websites`, `/use-cases/designs` mit echten Case-Studies (sobald wir welche haben)

---

## 🔵 Tier 3 — Operations

### Backup & Recovery
- **DB-Backups**: aktuell keine. Pflicht für Public-Launch.
- pg_dump cron auf Hetzner-Server, Backup zu S3 oder gleichem Host in separates Volume
- Restore-Test alle 6 Monate
- Aufwand: 1h

### Monitoring
- **Uptime-Check** — Cronitor, Healthchecks.io, oder selber gehostet (Uptime Kuma). Ping alle 5 Min auf `/`. Alert per Email/Slack bei Downtime.
- **Server-Metriken** — Docker stats reichen für Anfang, später Grafana/Prometheus
- **Apdex / Response-Time** — Bei Skalierung relevant

### Logging-Aggregation
- Aktuell: structured logs in stdout, gehen in Docker-Logs
- Bei >2 Containern: Loki + Promtail oder selber zu Logtail/Datadog/Sentry
- Aufwand: 2-3h Setup, +1h pro Container

### Status-Page
- statuspage.io / instatus.com / cstate (selber gehostet) — public-facing
- Zeigt System-Status, geplante Wartungsfenster
- Optional aber Vertrauen-Building

---

## 🟣 Tier 4 — Feature-Wünsche

### App-UI
- **Chat-View Cream-Boho** — Aktuell Glass-Dark in `ChatApp` + Sub-Components. Inkonsistent mit Marketing. Aufwand: groß (~6-8h), weil Persona-Sidebar + Message-Bubbles + Input-Area alle angefasst werden müssen.
- **Persona-Image-Gallery** auf Landing — zeig 5 generierte Persona-Avatare als Beispiel

### App-Funktionalität
- **Real-time Multi-Browser-Sync** — User hat 2 Tabs offen, beide updaten parallel. Vermutlich schon via SSE+Redis, aber Edge-Cases checken.
- **Session-Templates** — User speichert eine Session-Setup-Konfiguration als Vorlage
- **Persona-Library** — User-eigene Personas wiederverwendbar über Sessions
- **Public-Persona-Marketplace** — Community-shared Personas

### Admin
- **Audit-Log-Viewer** — UI für `admin_audit_log` Table im Admin-Bereich
- **i18n auf Admin-Pages** — aktuell hardcoded Deutsch
- **Admin-Reactivate Deleted Account** — UI-Button um `deletion_requested_at` zurückzusetzen

### Integrations
- **Slack-Integration revisited** — Slack-Variante bleibt unangetastet, aber falls jemand Web→Slack-Brücke will
- **Webhook-Output** — User kann eigenen Webhook konfigurieren, Syn pingt bei Session-End
- **API-Zugang** — Team-Plan-Feature, dokumentiert via OpenAPI

---

## 🗑️ Tech-Debt

### migrate.ts
- Aktuell läuft jede Migration bei jedem Container-Boot
- Sollte einen `schema_migrations`-Tracker haben (analog Rails/Django)
- Aufwand: ~30 Min

### Legacy /landing-Route
- Existiert nur noch als 307-Redirect zu `/`
- Nach 1-2 Monaten kann komplett raus
- Aufwand: 2 Min

### Resend-Account
- User hatte Resend-Signup gemacht, dann auf Gmail-via-n8n umgestellt
- Account kann gelöscht werden (nicht benutzt, kost nix)

### Datenschutz/AGB-Update bei Chargebee-Go-Live
- AGB §4(2) erwähnt schon Chargebee → ✓
- Datenschutz Section 8 erwähnt Chargebee → ✓
- Beide brauchen anwaltliche Prüfung bevor wir Geld nehmen (Warning-Box war drin, jetzt rausgenommen — aber Pflicht bleibt)

---

## ✅ Erledigt seit dem letzten Update (für Kontext)

- Landing-Page komplett (Cream-Boho-Mockup, Gemini-Bilder, DE/EN)
- Auth-Flow komplett (Login/Register/Forgot/Reset/Verify/Confirm-Email-Change)
- Production-grade auth: verify-before-login, Rate-Limits, Cookie-Hardening
- Settings-Page (Profile, Email-Change, Password-Change, Sprache, Account-Loeschung)
- Legal-Pages (Impressum / Datenschutz / AGB)
- Custom 404 / 500 Pages
- Dev/Prod-Stack-Split (Container, DB, Volumes, Secrets — aber NICHT Workflows, siehe Tier 1)
- Caddy-Routing für 9 Hostnames + Subdomain-Redirects
- 4 n8n-Mail-Workflows (Invite / VerifyEmail / PasswordReset / EmailChange) — cream/boho Design
- OWASP Top-10 Phase 1 + 2 (Security-Headers, Rate-Limits, Cookie-Hardening, Dep-Updates, IDOR-Audit, Admin-Audit-Trail, Dependabot)
- Coordinator + Audience Callback-URL dynamisch (Stack-aware)

---

_Wenn was fehlt: einfach in den entsprechenden Tier hinzufügen + commiten._

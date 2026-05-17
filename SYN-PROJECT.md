# Syn — Project Brief & State of Play

> Synthetic Focus Groups as a Service. Multi-Agent-LLM-Diskussionen mit 5 verschiedenen Personas, die ein Problem aus unterschiedlichen Perspektiven durchleuchten, drei Runden lang, mit auto-generierter Synthese und Abschluss-Bericht.

---

## 1. Vision

Echte Fokusgruppen sind teuer, langsam, und die Probanden sind selten exakt die richtige Zielgruppe. Syn ersetzt das durch:

- **5 synthetische Personas** mit individuellen Profilen, Haltungen und Perspektiven
- **3 strukturierte Runden** (Bauchgefühl → Konstruktive Vorschläge → Priorisierte Handlungsliste)
- **Real-Time Multi-Persona-Diskussion** mit echten Disagreements (über `rigidity` Score steuerbar)
- **Vision-fähig** — Personas können Screenshots, PDFs, Mockups bewerten
- **1:1 Follow-Up** mit einzelnen Personas nach Abschluss
- **Strukturierter Abschlussbericht** als Markdown im Chat + PDF-Download

Zielgruppe: Worqshop-Kunden + interne Strategiearbeit. Pricing-Hypothese: ~50€/Fokusgruppe.

**Live:** https://syn.worqshop.io
**Repo:** https://github.com/techworqshop/syn
**Host:** worqshop Server (`128.140.8.255`, Ubuntu 24.04)

---

## 2. Status

**Production-ready für interne Nutzung.** Vor allem dazu, mit verschiedenen Themen iterieren um Persona-Qualität + Synthese-Tiefe zu kalibrieren.

| Bereich | Status |
|---|---|
| Auth + Multi-User + Invites | ✅ |
| Session-Erstellung + 3 Runden + Synthesen | ✅ |
| File-Upload + Vision (Screenshots/PDFs) | ✅ |
| Persona-Portraits (Gemini 2-Stage) | ✅ |
| Synthese pro Runde | ✅ |
| Abschlussbericht (Text-Bubble + PDF) | ✅ |
| 1:1 Interview mit Persona | ✅ |
| Share-Link (Read-Only + .md-Export) | ✅ |
| Admin-Page (Analytics/Users/Sessions/Errors/Invites) | ✅ |
| Filter + Sort + CSV-Export | ✅ |
| LLM-Cost-Tracking (Token + USD per Modell) | ✅ |
| Session-Lock nach Runde 3 (Anti-Spam) | ✅ |
| Help/FAQ-Seite | ✅ |

---

## 3. Architecture

```
Browser
  │
  ▼
Caddy (TLS, Reverse-Proxy)  ───► syn.worqshop.io ─┐
                            └──► n8n.worqshop.io ─┤
                                                  │
                  Docker host (128.140.8.255)     │
                  ┌───────────────────────────┐   │
                  │  synweb_default network   │   │
                  │  ┌──────────────────┐     │   │
                  │  │ synweb-app       │◄────┼───┘
                  │  │ Next.js 15 SSR   │
                  │  │ (Node runtime)   │
                  │  └──────┬───────────┘
                  │         │
                  │  ┌──────▼────────┐  ┌────────────┐
                  │  │ synweb-postgres│ │synweb-redis│
                  │  │ (User-DB)      │ │  Pub/Sub   │
                  │  └────────────────┘ └────────────┘
                  └───────────────────────────┘
                              │
                              │ via n8n_default
                              ▼
                  ┌──────────────────────────┐
                  │  n8n_default network     │
                  │  ┌──────────────┐        │
                  │  │ n8n-n8n-web-1│        │  ◄── orchestriert alle
                  │  └─┬────────────┘        │      LLM-Calls + Tools
                  │    │                     │
                  │  ┌─▼────────────────┐   │
                  │  │ n8n-postgres-1   │◄──┼── synweb-app liest read-only
                  │  │ (DataTables +    │   │   für Token/Cost Analytics
                  │  │ Execution-Logs)  │   │
                  │  └──────────────────┘   │
                  └──────────────────────────┘
                              │
                              ▼
                  ┌──────────────────────────┐
                  │ External APIs            │
                  │ Anthropic (Sonnet/Opus)  │
                  │ Google Gemini (Vision)   │
                  │ Gmail OAuth (Invites)    │
                  └──────────────────────────┘
```

**Wichtig:** Slack-Variante von Syn läuft separat auf demselben n8n-Server (eigene Workflows), wird nicht angefasst. Web-Variante hat eigene Workflows mit `SynWeb_*` Prefix.

---

## 4. Tech Stack

| Layer | Tool |
|---|---|
| Frontend / SSR | Next.js 15 App Router, React 19, Tailwind 3 |
| Auth | NextAuth v5 (JWT-Session, Credentials Provider) |
| ORM | Drizzle ORM + postgres-js |
| DB | PostgreSQL 16 |
| Pub/Sub (SSE) | Redis 7 |
| LLM-Orchestrierung | n8n (extern, AI Agent Node) |
| Vision | Google Gemini 3-flash-preview + 3.1-pro-preview |
| Reasoning | Claude Sonnet 4.6 (Persona/Audience/Synthesize), Opus 4.7 (Coordinator/FinalReport) |
| PDF | pdfkit |
| File-Storage | Disk (Docker volume `/uploads`) |
| Mail | Gmail OAuth via n8n |
| Image-Gen | Gemini 2-stage Pipeline (Text-Forensik → image-gen) |

---

## 5. Datenmodell (synweb-postgres)

```
users (id, email, password_hash, is_admin, must_change_password)
  │
  └─►  sessions (id, user_id, title, problem_brief, status, current_round, persona_count, share_token)
         │
         ├─► messages (role, persona_slot, persona_name, content, round_number, metadata{kind})
         │     kinds: persona_round, synthesis, coordinator, system, status, error,
         │            report, report_text, report_status
         │
         ├─► audience_messages (persona_slot, role, content)   ── 1:1 Interview
         │
         ├─► files (file_name, mime_type, storage_path, category, summary, size_bytes)
         │     categories: briefing, persona, panel
         │
         ├─► syntheses (round_number, synthesis_text)
         │
         └─► persona_images (slot, storage_path, status, attempts)

invites (email, token, expires_at, used_at, invited_by)
```

**Source-of-Truth-Split:**
- `synweb-postgres` → user-facing app data (users, sessions, messages, files)
- `n8n-postgres` → Panel-DataTables (`panel_sessions`, `panel_personas`, `panel_syntheses`, `panel_files`) — die ECHTEN Panel-Inhalte. SynWeb spiegelt nur für UI.

---

## 6. n8n Workflow-Kette

Jeder User-Klick triggert eine Workflow-Kette:

```
User schreibt im Web
  │
  ▼ POST /api/sessions/[id]/message
  │
  ▼ Webhook: SynWeb_Gateway
  │   responseNode → "Respond OK" feuert sofort
  │   parallel: routet zu Coordinator oder Audience
  │
  ▼ SynWeb_Coordinator (Opus 4.7 AI Agent)
  │   Tools: Run Round, Save Brief, Update Rigidity, Post Status,
  │          Read File List, Read File Content, ...
  │
  ▼ Tool "Run Round" → SynWeb_RunRound
  │   - Get Personas
  │   - Fan-Out 5x parallel via HTTP →
  │     SynWeb_RunPersonaWebhook → SynWeb_RunPersona
  │       (Sonnet 4.6 Agent, mit "Ask Vision" Tool für Gemini Forensik)
  │   - Poll DB für completion, optional retry
  │   - Post Status: "Alle Stimmen sind da..."
  │   - Trigger SynWeb_SynthesizeWebhook → SynWeb_Synthesize (Sonnet 4.6)
  │   - Round Complete returned to Coordinator
  │
  ▼ Jede Persona/Synthese ruft HTTP /api/n8n/callback
  │   - Insert into messages, audience_messages, syntheses
  │   - Publish via Redis → SSE → Browser
  │
  ▼ Frontend zeigt Bubbles live
```

**Wichtige Workflow-IDs:**

| ID | Name |
|---|---|
| V0CpwraeTYxQh6BM | SynWeb_Gateway |
| A3jxDuimyDE2G6uO | SynWeb_Coordinator |
| XybiSig1oi3HquZd | SynWeb_RunPersona |
| M04sAqjOhZRVGlXb | SynWeb_Audience |
| xgBgCZeVWBVB7jLN | SynWeb_Synthesize |
| ubm4FU2nKDKuvFgw | SynWeb_RunRound (Fan-Out Orchestrator) |
| Iu9BXYdydQueQC41 | SynWeb_ReadState |
| oFGYiNFs7B1At0n0 | SynWeb_IngestFile |
| jMQEQggtVPu7XOwK | SynWeb_AskVision |
| vJ1K27VranwixXK1 | SynWeb_FinalReport |
| 43KZPaaRtfchFZ8h | SynWeb_SendInvite |

---

## 7. Feature-Katalog

### User-Flow (was sieht der End-User)

1. **Dashboard** — Sessions-Liste mit „Abgeschlossen"-Status, neue erstellen
2. **Session-View** —
   - WhatsApp-Pattern: User-Bubbles rechts, Personas links
   - Card-Cream Bubbles mit farbigen Edge-Stripes (top-bottom Gradient)
   - Avatar-Kreise mit gleichem Gradient
   - Persona-Sidebar links (einklappbar, Rigidity-Slider pro Persona)
   - File-Pills mit drei Kategorien (Briefing/Persona-Daten/Panel-Review)
   - „Mehr lesen"-Collapse für lange Persona-Antworten
3. **Nach Runde 3** —
   - Chat gesperrt, friendly Banner mit Hinweis auf 3-Punkte-Menü + Sidebar-1:1
   - Coordinator-Prompt verhindert weitere Runden-Angebote
4. **3-Punkte-Menü** —
   - Abschlussbericht (PDF) — als Text-Bubble + PDF-Download
   - Chat-Verlauf PDF
   - Teilen → Read-Only-Link (kopierbar)
   - Löschen
5. **Share-View** (`/share/[token]`) —
   - Read-only Chat
   - Datei-Downloads
   - Markdown-Transcript-Button → `.md` für ChatGPT/Claude
6. **Help-Page** (`/app/help`) — 4-Schritte-Ablauf + FAQ

### Admin-Page (`/app/admin`)

- **Analytics**
  - 8 Counter (Users, Sessions, Messages, Audience, Files, Reports, Ø-Dauer, Tokens)
  - LLM-Kosten-Card (USD + EUR Approximation)
  - Tokens & Kosten pro Modell-Family (Tabelle)
  - Funnel: Created → Started → R1 → R2 → R3 → Report mit Conversion-Raten
  - Bar-Chart Sessions+Messages pro Tag (mit X-Labels alle ~10 Tage)
  - Hour-Histogramm (24h Aktivitätsverteilung)
  - Dateien nach Kategorie (Progress-Bars)
  - Top-10-User-Tabelle (filterbar)
- **Users** — Liste mit Per-User-Stats, klickbar → Detail-Page mit Sessions + 30-Eintrag-Timeline + Admin-Toggle
- **Sessions** — alle Sessions cross-user, Status-Filter, sortierbar, Klick → Read-Only-Drilldown
- **Errors** — Stuck-Sessions (User wartet >15min) + Verlassen (kein Message ever) + letzte 50 system/error Messages
- **Invites** — Pending/Verbraucht/Abgelaufen, Create + Revoke

Alle Tabs: einheitliche Filter-Bar (Email/Name/Titel-Substring), Sort per Header-Klick, CSV-Export (Users + Sessions).

### Security

- **Edge-Middleware** (`middleware.ts`, nodejs runtime) gated alle `/app/admin/*` + `/api/users/*` + `/api/invites/*` Pfade via NextAuth `authorized` callback
- **JWT carries `isAdmin`** Claim, populiert beim Sign-in + Fallback-DB-Lookup im jwt-Callback
- **Layout-Gate + Page-Gate + API-Gate** — DB ist Source-of-Truth, JWT nur für Edge-Speed
- **adminGuard()** Helper: API-Routes returnen 401/403 statt 500 bei nicht-Admin
- **Session-Lock nach Runde 3** + Backend-Guard im Message-Route (423 Locked)
- **Cleanup beim Session-DELETE** — Cascade via DB + Disk-Räumung (uploads + reports + persona-images)
- **Orphan-Cleanup-Cron** Sonntags 04:00 (Dirs ohne DB-Eintrag)

---

## 8. Color & Design System

Komplette UI-Redesign vor zwei Tagen — natürliche Erdtöne, keine synthetischen Farben, WhatsApp-Pattern.

**Surfaces:**
- Background: Linen `#E8E2D2`
- Cards: Card Cream `#F3EFE2`
- Text: Ink `#1F2420`

**Persona-Slots (Top-Bottom-Gradient für Edge + Avatar):**

| Slot | Family | Top | Bottom |
|---|---|---|---|
| 1 | Crimson | #E55260 | #B82338 |
| 2 | Deep Emerald | #3A7E58 | #144A2C |
| 3 | Orange Glow | #F26A38 | #C53E0F |
| 4 | Mustard | #DBA947 | #A77E22 |
| 5 | Bordeaux | #913B4F | #4F1A28 |

**Role-Akzente:**
- User: Mint Teal #9CCABF → #5FA28F
- Syn (Coordinator): Purple-Rose #4C1D95 → #BE123C ← Brand-Identity
- Synthese: Amber #B45309 → #78350F
- Primary CTA (btn-primary): Purple → Rose → Red (Syn-Brand-Gradient)

**Layout:**
- Bubble max-width 85%
- Edge-Accent als 4px-Streifen mit vertikalem Color-Color-Gradient
- Avatare rund mit gleichem Gradient
- Bubble-Background **uniform** Card-Cream — kein Color→Weiß-Verlauf darin
- Sidebar links (mit Rail-Mode collapse), Topbar dünn

---

## 9. Known Limitations & Tech Debt

- **Token-Bills via Char-Heuristik veraltet** — jetzt echte Werte aus n8n-Postgres
- **Persona-Type-Stats fehlen** — Top-Personas-Typen aus n8n DataTable `panel_personas` wären nice
- **Password-Reset Flow fehlt** — neu-invited User-Pattern als Workaround
- **n8n-Execution-Health-Card fehlt** — Errors pro Workflow letzte 24h könnte nützlich sein
- **DB-Backup-Strategie nicht dokumentiert** — `/root/synweb/pg_data` ist nur Volume, kein off-host Backup
- **Worqshop-Branding noch nicht final** — aktuell Syn-only Branding
- **Mobile-Layout grenzwertig** — Sidebar zwingt Desktop ≥ ~900px

---

## 10. Konzeptionelle Weiterentwicklungs-Ideen

### Produkt
- **Custom Persona-Pakete** — vorgespeicherte Persona-Sets für Branchen („B2B-SaaS-Käufer", „Mittelstand-CEO", „Gen-Z-Konsument") die User per Klick wählen können
- **Cross-Session-Insights** — Aggregation über mehrere Fokusgruppen desselben Users („Was sagt das Pricing-Persona generell zu €99-Produkten?")
- **Team-Workspaces** — Gemeinsame Sessions zwischen Worqshop-Tech und einem Kunden
- **Persona-Memory** — Personas erinnern sich an vorherige Sessions („Anneliese hat schon mal über Outdoor-Bekleidung diskutiert")
- **Comparative Mode** — A/B-Test von zwei Briefings im selben Panel
- **Persona-Edits durch User** — manuell Profile schärfen
- **Stimme statt Text** — Voice-Input + Voice-Synthese (kostspielig)

### Tech / Architektur
- **Streaming Synthesis** — Synthese während Erstellung Stück für Stück streamen (heute Plain-Response am Ende)
- **Background-Jobs als Queue** — aktuell n8n + Polling; Redis-Queue (BullMQ) wäre robuster
- **Multi-Tenant-Trennung** — wenn Kunden ihre eigenen Workspaces bekommen, isolierte Persona-Pools
- **Vector-Embedding für Persona-Continuity** — Personas haben semantic memory across sessions
- **n8n → langgraph/agno migration** — wenn die Workflow-Komplexität weiter wächst, könnten code-first Frameworks Iteration beschleunigen
- **Native Mobile-App** — React Native auf demselben Backend
- **API-First** — Sessions auch via REST-API startbar für Integration in andere Tools

### Monetisierung
- **Pay-per-Session** ~50€ (aktuell die Hypothese)
- **Pro-Plan** Flat-Rate für Agenturen mit unlimited Sessions
- **Add-On: Custom Persona** — User uploadet LinkedIn-Profile, Syn baut Persona daraus
- **White-Label** — Kunden hosten Syn unter eigener Domain mit ihrem Branding
- **Data-Export-Tier** — strukturierter Output (JSON, Excel mit allen Personas-Antworten + Insights)

### Wettbewerbs-/Positionierungs-Hypothesen
- **Vs. echte Fokusgruppen:** 100x schneller, 50x billiger, aber Validierung nötig dass die Insights vergleichbar/komplementär sind
- **Vs. „ChatGPT mit 5 Personas-Prompt":** Strukturierte Runden + echte Persona-Persistenz + Vision + Synthese als USP
- **Vs. user-research Tools (Maze, Lookback):** Wir simulieren statt zu rekrutieren — kein Personen-Pool nötig

---

## 11. Operational

**Server-Pfade:**
- Code: `/root/synweb/`
- App: `/root/synweb/app/src/`
- Workflows-Backup: `/root/synweb/infra/synweb-workflows/`
- Uploads: `/root/synweb/uploads/` (mounted in Container als `/app/uploads`)
- Env: `/root/synweb/.env` (NIE committen)

**Häufige Commands (über SSH-MCP):**

```bash
# Rebuild + restart
cd /root/synweb && docker compose build app && docker compose up -d --force-recreate app

# Logs live
docker logs -f synweb-app

# Postgres-Shell (synweb)
docker exec -it synweb-postgres psql -U synweb -d synweb

# Postgres-Shell (n8n, für panel_*)
docker exec -it n8n-postgres-1 psql -U n8n -d n8n

# n8n Workflow exportieren/importieren
docker exec n8n-n8n-web-1 n8n export:workflow --id=<ID> --pretty --output=/tmp/x.json
docker exec n8n-n8n-web-1 n8n import:workflow --input=/tmp/x.json

# Caddy reload
systemctl reload caddy
```

**Crons (`/root/synweb/infra/cron-scripts/`):**
- `uploads_cleanup.sh` — täglich, Files >7 Tage löschen (außer reports/personas)
- `orphan_cleanup.sh` — wöchentlich, Disk-Dirs ohne DB-Session löschen
- `reports_cleanup.sh` — monatlich, PDFs >30 Tage löschen
- `postgres_vacuum.sh` — wöchentlich VACUUM ANALYZE
- `log_prune.sh` — monatlich, alte SynWeb-Logs truncen

---

## 12. Letzte größere Iterationen (Mai 2026)

In den letzten ~3 Tagen wurden in den folgenden Bereichen iteriert:

- **Bilderkennung** — Gemini 3 Pipeline + Ask-Vision-Tool für Personas
- **Parallelisierung** — Personas laufen parallel statt sequentiell (~5x speedup)
- **UI komplett-Redesign** — Erdtöne, WhatsApp-Layout, Card-Bubbles mit Edge-Accent
- **Stability** — Caddy-Proxy-Timeouts, Gateway responseNode-Reihenfolge, Anti-Warmup-Prompt, Resilient Final-Report (Container-Restart-tolerant)
- **Reports** — PDF Earth-Tones, Text-Bubble + PDF combo, Empty-Page-Bug, Markdown-Heading-Fixes
- **Session-Lock nach Runde 3** + Coordinator-Prompt-Update + Front+Backend-Guard
- **Sharing** — Markdown-Transcript-Export, File-Downloads in der Share-View
- **Admin-Page** komplett (Analytics + Users + Sessions + Errors + Invites + Detail-Drilldowns + Filter + Sort + CSV-Export + Admin-Toggle + Real-Token-Cost-Tracking)
- **Security-Hardening** — Edge-Middleware, JWT-Claim, mehrere Guard-Layers
- **Help/FAQ-Page** als User-Onboarding
- **n8n-Network-Bridge** — synweb-app jetzt auch auf `n8n_default` Network für Token-Sync

---

## 13. Wen kann ich fragen?

- **Tech-Lead:** Lukasz (Worqshop) — Wahrgenommen-Eigentum, alle Architektur-Entscheidungen
- **Co-Founder:** Simon, Lorenz (Worqshop) — strategische Input + Use-Cases
- **Repo + Server-Zugang:** `tech@worqshop.io` Account

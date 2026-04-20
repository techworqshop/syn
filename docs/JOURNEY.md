# SynWeb Entwicklungs-Log

Chronologischer Überblick über Entscheidungen, Bugs und Features.
Ergänzt `CLAUDE.md`. Zu jedem Punkt der ~Commit-ID.

## Ausgangspunkt

User hatte Syn als Multi-Agent Fokusgruppen-System rein über Slack laufen.
11 n8n-Workflows im Syn-Ordner (Slack Gateway + 5 Persona-Gateways + Coordinator + 4 Sub-Workflows + Setup-Tables).
Anforderung: Web-App als zusätzlicher Kanal, Slack-Seite NICHT anfassen.

## Architektur-Entscheidungen

**Isolation Level B**: eigene Postgres+Redis Container (nicht shared). Löschen = ein Befehl. Kosten: +~250MB RAM (OK bei 7.6GB).

**n8n bleibt Orchestrator**: statt Anthropic SDK direkt im Webapp, LLM-Calls weiter über n8n Workflows. Gründe: visuelles Debugging, Credential-Isolation, gemeinsame Engine für Slack+Web. Trade-off: +20-30% Latenz.

**Getrennte Workflow-Familie**: SynWeb_* als Kopien der Syn_*, mit Web-Callback statt Slack-Post. Slack-Memory-Keys: `syn_*`. Web: `synweb_*`.

## Phase 0 — Backups + Repo

- 11 Syn-Workflows als JSON exportiert, gespeichert in `backups/workflows-2026-04-16/`
- Geprüft: nur Credential-Referenzen, keine echten Secrets → safe für Git
- Repo init, initial commit, push auf GitHub

## Phase 1 — Infrastruktur

- Docker-Stack mit eigener postgres+redis+app
- Caddyfile-Block für `syn.worqshop.io`, TLS automatisch
- Next.js 15 + NextAuth v5 Credentials + Drizzle + postgres-js
- Admin tech@worqshop.io geseedet

## Phase 1b-c — Build-Fixes

Startbugs:
- Lazy DB-Init (war synchron → crash beim Build ohne DATABASE_URL)
- `force-dynamic` auf auth-Pages wegen Prerender
- Route-Group `(app)` war falsch → URLs fehlten `/app/` Prefix, Ordner umbenannt
- `AUTH_TRUST_HOST=true` für Reverse Proxy
- Top-level await in migrate/seed → async main wrapper

## Phase 2 — SynWeb-Workflows

Per Python-Transform-Skript geklont aus Syn_*:
- SynWeb_Gateway: Webhook statt Slack-Trigger, routed zu Coordinator oder Audience
- SynWeb_Coordinator: System-Prompt 1:1, aber Web-Callback statt Slack-Post, memory-key `synweb_` statt `syn_`
- SynWeb_RunPersona: HTTP-Callback nach Save Response
- SynWeb_Audience: 5 Slack-Replies durch 1 Web-Callback ersetzt
- SynWeb_Synthesize: HTTP-Callback

Import via `n8n import:workflow --input=...`, danach über MCP aktivieren.

Bugs beim Import:
- "null value in id" → IDs vorab generieren (16-char nanoid-style)
- Alte IF-Nodes: neue Version braucht `singleValue: true` bei unary ops + `options.version: 2`

## Web App Phase 2

- DB-Schema: users, sessions, personas, syntheses, messages, audience_messages, files
- API: sessions CRUD, message forwarding, callback receiver, SSE stream
- UI: dashboard + chat view + persona sidebar + 1:1 modal

## Phase 2b — Personas + Files

- `SynWeb_ReadState`: Webhook, liest panel_personas + panel_syntheses
  - Bug: DataTable-Queries liefen N× (Duplikate). Fix: `executeOnce: true`
- `SynWeb_IngestFile`: Webhook, lädt File, Haiku-Summary, -> panel_files
- Webapp `/api/files/[id]` public, damit n8n via `file_url` downloaden kann

## Phase 2c — File-Categories + UI Polish

- `files.category`: briefing / persona / panel
- Upload-Modal: Drag&Drop, multi-file, per-file dropdown, progress-bar pro File (XHR)
- Globals.css: mesh radial gradient, warm dark base, glass morphism
- `.btn-primary`: violet→fuchsia→rose Gradient mit glow
- Slot-Farben: 1 rose, 2 amber, 3 emerald, 4 violet, 5 sky

## Phase 2e — Fantasy-Namen

- Coordinator-System-Prompt ersetzt: Alpha/Beta/Gamma/Sigma/Omega raus, realistische Namen rein (Sarah Klein, Markus Weber, ...)
- Slot 1-5 bleibt intern für Routing
- PersonaSidebar + AudiencePanel zeigen `persona.name` statt fixer Label
- Callback-Handler sucht realen Namen via readState

## Phase 2f — Critical Bug-Fixes

- **Leere Persona-Bubbles Runde 2+**: RunPersona-Callback las `$json.content[0].text`, aber am Callback-Punkt war `$json` die Save-Response-Output (leer). Fix: explizit `$('Run Persona Analysis').first()?.json.content[0]?.text || $('Run Persona No Files')...`
- **"Gateway-Fehler: Unexpected end of JSON input"**: forwardToGateway warf auf leerem Response. Fix: `res.text()` + try-parse, fallback `{}`
- **Empty content in callback**: skip-insert wenn text leer
- **Persona-Names "alpha/beta/..."** statt real names: callback-handler ruft readState, findet real name per persona_id

## Phase 2g — Auto-Titel + Session-Management

- `title_locked` flag; Gemini Flash generiert Titel im Callback-Handler nach 1. Coord-Message
- Manueller Rename im Chat-Header (sets title_locked)
- Dashboard: Kebab-Menu pro Karte (SessionMenu component)
- Actions: Delete (cascade), Duplicate, Export, Share (public /share/[token])

## Phase 2h — Avatare + Files in Synthese

- Syn-Avatar über Gemini 2.5 flash-image generiert, persistent
- Settings-Seite entfernt (User wollte festes Bild)
- Persona-Images auto-generated via `lib/persona-image-gen.ts` im Callback
- `PersonaAvatar` Client-Component: image mit fallback auf Initialen
- SynWeb_Synthesize refactored: Agent raus, direkte Anthropic-Calls mit attachments
- Zwei Pfade: "Synthesize With Files" / "Synthesize No Files"

## Phase 2h2 — PDF Export

- pdfkit, Chat-Verlauf farblich kodiert
- Ersetzte JSON-Export ("Jason interessiert keinen")

## Phase 2i — Slack-Style Input

- Unified Container, Icon-Buttons, Send grey→gradient
- Paperclip-Icon statt "Dateien"-Text

## Phase 2j — Invite-System

- `invites` table + `SynWeb_SendInvite` workflow (Gmail via zHsOQgsahwMpHDy9)
- Keine neue SMTP-Config, wiederverwendet Tech-Credential aus Tasha-Workflow
- Admin-Seite + public `/invite/[token]` registration

## Phase 2k — Admin-Gating

- `users.is_admin` + Auto-Admin für @worqshop.io
- `requireAdmin()` gated /api/invites und /api/users
- Layout conditional, server-wrapped page mit redirect
- `/app/users` zeigt Accounts + Pending Invites, Kick-Button

## Phase 2l — Bugfixes + Error Handling + Progress Indicator

User hat drei Bugs in erster Echt-Session gemeldet (session c2f2c357...):

**Bug 1 — Doppelte Synthese (EN + DE)**
- Synthesize-Workflow postet Synthese via Callback; Coordinator bekam den Text als Tool-Output zurück und hat ihn als eigene Antwort in Deutsch nochmal repostet.
- Fix: Coordinator-System-Prompt sagt jetzt explizit _"Synthesize Round postet automatisch. Don't repeat or paraphrase. Nur kurzer Ack-Oneliner danach."_
- Zusätzlich: Synthesize-Prompts auf Deutsch lokalisiert (Sektionen KONSENS/SPANNUNGSLINIEN/UEBERRASCHUNGEN/OFFENE LUECKEN/ENTSTEHENDE FRAGEN + System-Msg _"antworte in der gleichen Sprache wie Personas"_).

**Bug 2 — Personas referenzieren andere Panelisten**
- Tobias schrieb _"bin ich wahrscheinlich der Gegenpol zu Miriam"_. Ursache: Coordinator hat _"Gegenpol zu Miriam"_ wörtlich in Tobias' `profile` gespeichert; RunPersona reicht Profile 1:1 durch.
- Fix: In SAVING PERSONAS prompt neue Regel — _"profile must describe the persona standalone. No references to other panelists, no 'Gegenpol zu X', no 'counterpart to Y'. Productive tension emerges from authentic views, not from embedded pairing instructions."_

**Bug 3 — Persona-Bilder erscheinen nicht**
- `generatePersonaImage` wurde NUR bei `kind=coordinator` im Callback getriggert. Zwischen Persona-Saving und Round-1-Ende gab es keine Coordinator-Message, also liefen Bilder erst Minuten später.
- Fix: Image-Gen triggert jetzt bei coordinator/persona/synthesis callbacks.
- Zusätzlich: `session.persona_count` und `current_round` wurden nirgends aktualisiert. Fix: route.ts berechnet beides aus readState und pusht via SSE (`type: "session", personaCount, currentRound`). Header im Chat ist jetzt live.

**Feature — Error Handling im Chat**
- n8n-Fehler verschwanden bisher silent. User sah nur kein Response.
- Gateway: `Execute Coordinator` + `Execute Audience` auf `onError: continueErrorOutput`. Error-Branch führt zu neuem `Notify Web Error`-Node der `POST /api/n8n/callback` mit `kind=error` schickt.
- Callback-Handler: neuer `kind=error`-Case → persistiert als `role=coordinator` Message mit `metadata.kind=error`.
- MessageBubble: erkennt `metadata.kind === "error"`, rendert mit rot/rose Gradient, red border, Label "Fehler".
- Gotcha: erster `jsonBody` hatte `'Probier''s'` (doppelter Apostroph als falsches JS-Escape) → JSON.stringify SyntaxError → leerer Body → Callback mit `invalid json` ignoriert. Fix: Apostroph raus, Error-Details aus `$json.error` angehängt.

**Feature — Progress-Indikator ("Reasoning-Variante")**
- User will sehen, was Syn im Hintergrund macht statt 60s Stille.
- Neuer Workflow `SynWeb_PostStatus` (6GNn5cZdVZyGoxR1): simples Sub-Workflow mit Execute-Workflow-Trigger + einem HTTP-Request an Callback mit `kind=status`.
- Coordinator bekommt neuen `toolWorkflow`-Node "Post Status" verbunden als `ai_tool`. $fromAI erzeugt hier kein problematisches Schema (funktioniert nur in toolWorkflow/dataTableTool, NICHT in `toolHttpRequest` — erster Ansatz mit toolHttpRequest scheiterte an Anthropic's `tools.0.custom.input_schema.properties`-Pattern-Validator).
- Callback: `kind=status` broadcastet als ephemeres SSE-Event, wird NICHT in messages-Tabelle persistiert.
- ChatApp: `useEffect` onmessage zweigt bei `type: "status"` ab, setzt `status` state + `waiting` state. Status wird kursiv als Typing-Indikator zwischen Messages gerendert, cleared sich bei nächster echter Message.
- Prompt-Hint im Coordinator: _"Before any slow tool, call Post Status ONCE with short one-liner (DE default, Präsens, max 40 chars)."_

**Fehlschläge auf dem Weg (zur Erinnerung)**
- Erster Post-Status-Versuch war `toolHttpRequest` mit `$fromAI` — Anthropic lehnte Tool-Schema ab. Placeholder-Definitions-Fix griff nicht. Gelöst durch Umstellung auf `toolWorkflow` + dediziertes Sub-Workflow.
- `maxIterations` von 25 → 50 hochgedreht um Rate-Limit-Fenster zu überschreiten; wieder auf 25 zurück. Root cause war nicht Iteration-Count sondern Konzentration von API-Calls pro Minute.
- Vorübergehend Model auf Sonnet 4.6 umgestellt — User hat explizit Opus 4.6 gefordert wegen Context Window, zurück auf Opus.
- System-Prompt war zwischenzeitlich aufgeblasen mit PROGRESS SIGNALING + CRITICAL PROFILE RULE mit Good/Bad-Beispielen + RUNNING A ROUND Section → reverted auf minimalen additiven Patch (zwei Sätze in SAVING PERSONAS + BEHAVIORS).

## Wiederkehrende Gotchas

1. SSH MCP Command-Limit 1000 chars — heredocs in chunks, Python-scripts in /tmp
2. n8n Workflow-Import legt inaktiv an — immer `activateWorkflow` danach
3. IF-Nodes v2+: unary ops brauchen `singleValue: true`; `options.version: 2` + `leftValue: ""` required
4. State-Split: Panel-Content in n8n-DataTables, User-Content in synweb-DB
5. Callback-Body: explizit `$('Node Name').first().json.xxx` statt `$json`
6. Dual-branch Anthropic (with/no files): check `.isExecuted`
7. Migrations: scripts/migrate.ts liest *.sql, idempotent
8. Build errors: lazy DB-init + `force-dynamic` auf auth-pages
9. Docker-build ~60-90s (npm install heavy)
10. `$fromAI(...)` funktioniert in toolWorkflow/dataTableTool, aber NICHT in toolHttpRequest — Anthropic rejected das generierte tool-schema. Fallback: eigenes Sub-Workflow + toolWorkflow.
11. n8n expression strings: Apostrophe in single-quoted Strings müssen mit `\'` escaped werden — doppelte Apostrophe sind KEIN valides JS-Escape, brechen JSON.stringify silent.
12. Error-Output in executeWorkflow: `onError: "continueErrorOutput"` → Error-Item landet auf main[1] mit `{...originalInput, error: "message"}`.

## Bewusst nicht (noch nicht) implementiert

- Admin-Toggle UI (aktuell via SQL oder Auto-Flag)
- Password-Reset (kein Flow)
- Streaming (Token-by-Token Tippen)
- Prompt-Caching für Token-Kosten
- File-Attach Live-Verifikation: Pipeline korrekt, aber empirisch noch nicht bestätigt dass Personas Binary statt Summary sehen

## Letzter Stand

Alles live. Admin = tech@worqshop.io + alle @worqshop.io Accounts.

User kann:
- Sessions erstellen, chatten, Dateien (3 Kategorien) hochladen
- Auto-benannte Titel, manuelles Umbenennen
- Sessions delete/dup/PDF-export/share
- User einladen (Gmail via n8n), self-register
- User kicken (außer self)
- Persona-Bilder auto-generiert, in Sidebar+Bubbles

Aktiver Commit beim Session-Ende: `4f1a67c` (CLAUDE.md hinzugefügt).

## Commit-History (chronologisch grob)

Siehe `git log --oneline`. Jeder Commit beginnt mit "Phase X" oder beschreibendem Slug.

## Phase 2m — Rigidity-Slider, Progressive Reveal, Markdown-Render, Abschlussbericht

Grosse Session mit vielen verbundenen Features.

**Per-Persona Rigidity-Slider**
- panel_personas.rigidity (double, default 5, NOT NULL) + column-metadata registriert
- UI: Slider 0-10 unter jeder Persona-Kachel, Label standhaft/ausgewogen/offen, save-on-release 400ms debounce
- Neuer Workflow SynWeb_UpdatePersona (DPGRWxdL6qyAEd6i): Webhook + direkter Postgres-UPDATE
- App-Endpoint PATCH /api/sessions/[id]/personas/[slot] ruft den Webhook
- RunPersona nimmt rigidity (number) statt rigidity_instruction (string), generiert Haltung-Text inline

**Progressive Persona-Reveal**
- syncPanelAndImages auch auf kind=status getriggert, Bilder starten frueher
- /api/sessions/[id]/personas returnt imageReady: boolean pro Persona
- PersonaSidebar filtert: nur assigned mit ready image, keine leeren Slots mehr

**Synthesis-Markdown-Rendering**
- app/src/components/Markdown.tsx shared util mit renderMarkdown(text)
- parsed H1-H3, bold, bullet lists, horizontal rules
- MessageBubble + PersonaSidebar nutzen die util fuer synthesis content

**AudiencePanel-UI-Redesign**
- Solo-Chats bekommen identischen Stil zum Hauptchat (Glass, Gradient-Bubbles, Avatar, Typing, Slack-Input) - ohne Upload-Button

**Abschlussbericht-Feature**
- SynWeb_FinalReport workflow (vJ1K27VranwixXK1): Opus 4.7, Markdown-Output mit Sections Executive Summary / Fragestellung / Panel / Verlauf / Spannungslinien / Erkenntnisse
- POST /api/sessions/[id]/final-report: fire-and-forget, inFlight-Lock, maxDuration=300
- PDF via pdfkit: Cover + gestufte Headings + bold + bullets - Farben fuer weisses Papier
- PDFs persistent unter /app/uploads/reports/<sessionId>/<reportId>.pdf
- Chat-Message mit kind=report + reportId + filename -> MessageBubble goldene Download-Card
- GET /api/reports/[sessionId]/[reportId] auth-gated stream
- SessionMenu: fetch POST (kein window.location mehr)

**Model-Upgrades 04-2026**
Coordinator/RunPersona/Audience: Opus 4.6 -> 4.7. Synthesize: Sonnet 4.5 -> 4.6. temperature-param raus (deprecated).

**Bugfixes**
- Hidden 0x0F im callback route.ts ("cordinator"), von chunked-transfer
- SynWeb_ReadState: alwaysOutputData:true
- SynWeb_DeleteFile: auf Postgres-Direct umgebaut
- pdfkit: Dockerfile kopiert *.afm ins .next/server/chunks/data/
- Final-Report Timeout -> fire-and-forget Pattern
- "human"-type: UI-Filter + Prompt-Hardening

**Gotchas 13-20**
13. DataTable v1.1 Get bei 0 Rows throwt -> alwaysOutputData:true
14. DataTable v1.1 Delete broken -> direkter Postgres
15. pdfkit Next.js: Dockerfile-RUN fuer afm-Fonts noetig
16. Opus 4.7 kein temperature mehr
17. Handler >60s: maxDuration + fire-and-forget
18. Base64-Chunked-Transfer fehleranfaellig - Python-Patch besser
19. window.location.href auf long API = crash, immer fetch()
20. Anthropic 450k input tokens/min - bei viel Context schnell gehittet

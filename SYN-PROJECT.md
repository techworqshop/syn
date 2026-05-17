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

Natürliche Erdtöne, „Boho-Office mit Pflanzen", WhatsApp-Layout. **Keine** synthetischen Farben (kein Türkis, Lila, Pink, Fuchsia außer dem Syn-Brand-Gradient).

### 8.1 Color Tokens

**Surface-Farben:**

| Token | Hex | Verwendung |
|---|---|---|
| `--bg-0` Linen | `#E8E2D2` | App-Hintergrund |
| `--bg-1` Card Cream | `#F3EFE2` | Bubble + Card-Base |
| `--bg-2` | `#DDD3BC` | Akzent-Hintergrund |
| `--fg-0` Ink | `#1F2420` | Primärer Text |
| `--fg-1` | `#4A4640` | Sekundärer Text |
| `--fg-2` | `#7A7268` | Tertiärer Text / Meta |
| `--accent` | `#BE123C` | Syn-Brand (rose-700 äquivalent) |

**Body-Background-Gradient** (gedämpfte Natur-Töne):
```css
background:
  radial-gradient(ellipse 900px 700px at 12% 8%, rgba(101,134,70,0.10), transparent 60%),
  radial-gradient(ellipse 1000px 800px at 88% 32%, rgba(214,165,88,0.09), transparent 60%),
  radial-gradient(ellipse 800px 600px at 50% 95%, rgba(143,122,80,0.10), transparent 60%),
  var(--bg-0);
```

**Persona-Slot-Gradienten** (jeweils [top, bottom] für Edge-Stripe + Avatar):

| Slot | Family | Top | Bottom | Tailwind-Approx |
|---|---|---|---|---|
| 1 | Crimson (Terracotta) | `#E55260` | `#B82338` | rose-500 → red-800 |
| 2 | Deep Emerald (Sage) | `#3A7E58` | `#144A2C` | green-700 → emerald-950 |
| 3 | Orange Glow | `#F26A38` | `#C53E0F` | orange-500 → orange-800 |
| 4 | Mustard (Honig) | `#DBA947` | `#A77E22` | amber-500 → yellow-800 |
| 5 | Bordeaux (Wein) | `#913B4F` | `#4F1A28` | rose-800 → rose-950 |

**Role-Akzente:**

| Role | Top | Bottom | Hinweis |
|---|---|---|---|
| User | `#9CCABF` | `#5FA28F` | Mint Teal — einziger nicht-Erdton |
| Coordinator (Syn) | `#4C1D95` | `#BE123C` | Brand-Identity Logo-Verlauf |
| Synthese | `#B45309` | `#78350F` | Warm Amber |
| Error | `#FCA5A5` | `#7F1D1D` | red-300 → red-900 |

**Status-Akzente:**

| Status | Color |
|---|---|
| Erfolg / Done | Syn-Brand (`#4C1D95 → #BE123C`) — z.B. „Abgeschlossen"-Pill |
| Briefing-Kategorie | Yellow `bg-yellow-200 border-yellow-700 text-yellow-950` |
| Persona-Daten-Kategorie | Deep Emerald `bg-emerald-900/15 border-emerald-900/60 text-emerald-950` |
| Panel-Review-Kategorie | Orange `bg-orange-200 border-orange-700 text-orange-950` |
| Warning | red-700 / red-100 |

### 8.2 Typografie

- **Font-Family:** Inter (system-ui fallback), `font-feature-settings: "ss01", "cv11"`
- **Antialias:** `-webkit-font-smoothing: antialiased`

**Hierarchie:**

| Element | Size | Weight | Color | Tracking |
|---|---|---|---|---|
| H1 Page-Title | 24–28px (`text-2xl/3xl`) | 600 | `text-stone-900` | tracking-tight |
| H2 Section | 14–16px | 700, uppercase | `text-stone-700` | tracking-wide |
| Body | 14–15px (`text-sm/[15px]`) | 400 | `text-stone-800` | normal |
| Meta / Caption | 11–12px (`text-xs`) | 500–700 | `text-stone-500/600` | tracking-wide bei uppercase |
| Bubble-Label | 14px | 600 | Akzent-Bottom-Stop | normal |
| Timestamps | 12px | 400 | `text-stone-500` | normal |

### 8.3 Spacing & Radius

- **Border-Radius:**
  - Bubbles + große Cards: `1.25rem` (20px) — `rounded-2xl`
  - Mid-Cards: `0.75rem` — `rounded-xl`
  - Small / Pills: `0.5rem`–`0.75rem`
  - Avatare: `rounded-full`
- **Padding-Pattern:**
  - Page-Container: `p-6` mit `max-w-5xl/6xl mx-auto`
  - Cards: `p-5`
  - Bubble-Body: `py-3 px-4` (plus 1.25rem extra left/right für Edge-Stripe)
  - Top-Bar / Chat-Header: `py-1.5 px-6` (bewusst dünn)
- **Gap:**
  - Avatar↔Bubble: `gap-3`
  - Inline-Pills: `gap-2`
  - Card-Grids: `gap-3`

### 8.4 Shadows

```css
/* Bubble-Drop-Shadow (subtil) */
box-shadow: 0 4px 16px -8px rgba(31,36,32,0.14);

/* Glass-Header */
box-shadow: 0 8px 32px -12px rgba(60,40,20,0.12);

/* Pill / Card */
box-shadow: 0 4px 24px -8px rgba(60,40,20,0.10);

/* Primary Button (Syn-Brand) */
box-shadow: 0 8px 24px -6px rgba(76,29,149,0.40),
            inset 0 1px 0 rgba(255,255,255,0.18);
```

### 8.5 Glass Utilities

```css
.glass {
  background: linear-gradient(135deg, rgba(255,253,247,0.70), rgba(243,239,226,0.55));
  backdrop-filter: blur(24px) saturate(1.6);
  border-bottom: 1px solid rgba(255,255,255,0.5);
}
.glass-card {
  background: linear-gradient(135deg, rgba(255,253,247,0.55), rgba(243,239,226,0.40));
  backdrop-filter: blur(20px) saturate(1.5);
  border: 1px solid rgba(255,255,255,0.55);
}
.glass-pill {
  background: linear-gradient(135deg, rgba(255,255,255,0.6), rgba(243,239,226,0.45));
  backdrop-filter: blur(14px) saturate(1.4);
  border: 1px solid rgba(255,255,255,0.6);
}
```

### 8.6 Component-Rezepte

**Bubble-Card** (User-side: `.bubble-card-right`):
```css
.bubble-card {
  position: relative;
  background-color: #F3EFE2;     /* uniform — KEIN Color→Weiß-Verlauf */
  color: #1F2420;
  border-radius: 1.25rem;
  padding-left: 1.25rem;          /* Platz für 4px Edge-Stripe */
  box-shadow: 0 4px 16px -8px rgba(31,36,32,0.14);
  overflow: hidden;               /* clip ::before zur Rundung */
}
.bubble-card::before {
  content: '';
  position: absolute;
  top: 0; bottom: 0; left: 0;
  width: 4px;
  background: linear-gradient(180deg, var(--edge-top), var(--edge-bottom));
}
.bubble-card-right { padding-left: 1rem; padding-right: 1.25rem; }
.bubble-card-right::before { left: auto; right: 0; }
```
Inline: `style={{ '--edge-top': hexTop, '--edge-bottom': hexBottom }}` — Edge-Color pro Persona.

**Avatar-Kreis** (gleicher Color-Color-Gradient):
```jsx
<div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ring-1 ring-white/40"
     style={{ background: `linear-gradient(180deg, ${top}, ${bottom})` }}>
  {initials}
</div>
```

**Primary CTA Button:**
```css
.btn-primary {
  background: linear-gradient(180deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%);
  color: #fff;
  padding: 0.625rem 1.25rem;
  border-radius: 0.75rem;
  font-weight: 500;
  box-shadow: 0 8px 24px -6px rgba(76,29,149,0.40), inset 0 1px 0 rgba(255,255,255,0.18);
  transition: filter 0.2s, box-shadow 0.2s, transform 0.2s;
}
.btn-primary:hover { filter: brightness(1.10); }
.btn-primary:active { transform: translateY(1px); }
```

**Pill (Status / Done):**
```jsx
<span className="inline-flex px-2 py-0.5 rounded-full text-white font-bold text-[10px] uppercase tracking-wide"
      style={{ background: "linear-gradient(180deg, #4C1D95, #BE123C)" }}>
  Abgeschlossen
</span>
```

**Pill (Kategorie / Tag, hell):**
```jsx
<span className="inline-block px-2 py-0.5 rounded-full border font-bold text-[11px] uppercase tracking-wide
                 bg-yellow-200 text-yellow-950 border-yellow-700">
  Briefing
</span>
```

**Card-Container (allgemein):**
```jsx
<div className="rounded-2xl border border-stone-300 bg-[#F3EFE2] p-5 shadow-sm">
  ...
</div>
```

**Filter-Bar / Search-Input:**
```jsx
<div className="rounded-xl bg-[#F3EFE2] border border-stone-300 px-3 py-2 shadow-sm flex items-center gap-2">
  <SearchIcon className="w-4 h-4 text-stone-500" />
  <input className="flex-1 bg-transparent text-sm text-stone-900 placeholder:text-stone-500 focus:outline-none" />
</div>
```

**Range-Slider (Rigidity, mit Color-Verlauf-Track):**
```css
.rigidity-slider {
  -webkit-appearance: none;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--edge-top), var(--edge-bottom));
}
.rigidity-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: #FFF;
  border: 2px solid var(--edge-bottom);
}
```

### 8.7 Layout-Pattern

- **Chat (WhatsApp-Style):** User-Bubbles rechts via `flex-row-reverse`, Persona-Bubbles links. Bubble max-width `85%`. Avatar `w-10 h-10` außen.
- **Sidebar:** Links (vor dem Chat-Container), `w-72` expanded, `w-14` rail-collapsed. Toggle persistiert in `localStorage` (`syn.sidebar.collapsed`).
- **Top-Bar:** `py-1.5` für minimal Vertikal-Eat. Logo links (Avatar + Syn-Schriftzug in `text-red-700`), User-Email + Admin-Link + Logout rechts.
- **Admin-Page:** Tab-Bar oben, Active-Tab mit Syn-Brand-Gradient `bg`, weiß Text. Content `max-w-6xl mx-auto p-6`.

### 8.8 Branding-Recap

- **Logo:** Cream-farbiger Kreis mit lila-rotem Verlauf-„Y" (Syn-Avatar PNG unter `/api/assets/syn-avatar`)
- **Brand-Gradient (Logo / Primary-Action):** `linear-gradient(180deg, #4C1D95, #BE123C)` — Purple-900 → Rose-700
- **Brand-Text-Color:** `#BE123C` (rose-700), Hover `#B91C1C`
- **Tone-of-Voice (Copy):**
  - Direkt, kein Marketing-Sprech
  - „Du"-Form auf Deutsch
  - Keine Emojis im Body (außer 🔒 für Lock, 📄 für PDF — funktionale Indikatoren)
  - Cleane Mikrokopie („Hol dir gerne in der Zwischenzeit einen Kaffee" statt „dauert länger als erwartet")
  - Tech-Wörter vermeiden bei User-facing („Diskussion abgeschlossen" statt „Session locked")

### 8.9 Don'ts

- ❌ **Kein** Color→Weiß-Gradient innerhalb der Bubbles — der Edge-Streifen trägt die Identität
- ❌ **Kein** Türkis, Pink, Fuchsia, Lila außerhalb des Syn-Brand-Verlaufs
- ❌ **Kein** stark-weißer Background — immer Card Cream `#F3EFE2` für hellste Surfaces
- ❌ **Kein** Drop-Shadow > 0.20 Opacity — alles bleibt soft
- ❌ **Kein** uppercase headlines außer kurz für Section-Labels (`text-[11px] uppercase tracking-wide font-bold`)
- ❌ **Keine** harten 90°-Ecken bei Cards — immer `rounded-xl/2xl`

### 8.10 Schnell-Lookup für Landing-Pages

Wenn du eine neue Landing-Page in Syn-Style baust, häufigste Elemente:

| Element | Snippet |
|---|---|
| Hero-BG | `bg-[#E8E2D2]` + Radial-Gradient-Stack aus 8.1 |
| Card | `rounded-2xl border border-stone-300 bg-[#F3EFE2] p-5 shadow-sm` |
| CTA Button | `.btn-primary` (Syn-Brand) oder Mint-Teal-Gradient für sekundäre |
| Heading | `text-3xl font-semibold tracking-tight text-stone-900` |
| Subheading | `text-sm text-stone-600` |
| Section-Label | `text-xs uppercase tracking-wide text-stone-700 font-bold` |
| Stat-Card | siehe Admin-Analytics `<Card>` — label + value + sub |
| Persona-Showcase | Avatar mit gradient + Name in Bottom-Stop-Color + Edge-Stripe-Card |

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

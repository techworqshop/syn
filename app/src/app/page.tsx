import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocaleFromCookies, type Locale } from "@/lib/i18n";
import { auth } from "@/lib/auth";
import LanguageSwitch from "@/components/LanguageSwitch";
import PricingSwitcher from "@/components/landing/PricingSwitcher";

export const dynamic = "force-dynamic";

const PERSONAS = [
  { slug: "maya",   name: "Maya Reyes",   role: { de: "Skeptische CMO",     en: "Skeptical CMO" } },
  { slug: "jonas",  name: "Jonas Frei",   role: { de: "Frühadopter PM",     en: "Early-adopter PM" } },
  { slug: "noor",   name: "Noor Hassan",  role: { de: "Budget-Lead",        en: "Budget lead" } },
  { slug: "adrian", name: "Adrian Cole",  role: { de: "Quereinsteiger",     en: "Career-switcher" } },
  { slug: "lia",    name: "Lia Tanaka",   role: { de: "Nutzerin",           en: "End user" } }
];

const PERSONA_STANCES: Record<string, { stance: { de: string; en: string }; blindspot: { de: string; en: string } }> = {
  maya:   { stance:   { de: "Misstrauen gegen Versprechen. Fragt: „Was heißt das in Q4?“",
                        en: "Distrusts promises. Asks: “What does that mean in Q4?”" },
            blindspot: { de: "Unterschätzt kreative Sprünge, die sich noch nicht in Zahlen zeigen.",
                         en: "Underestimates creative leaps that haven't shown up in the numbers yet." } },
  jonas:  { stance:   { de: "Sieht Potenzial schnell. Will testen, nicht analysieren.",
                        en: "Spots potential fast. Wants to test, not analyse." },
            blindspot: { de: "Verwechselt Begeisterung mit Marktrelevanz.",
                         en: "Confuses enthusiasm with market relevance." } },
  noor:   { stance:   { de: "Denkt in Trade-offs und Opportunitätskosten. Fragt immer: „Statt was?“",
                        en: "Thinks in trade-offs and opportunity cost. Always asks: “Instead of what?”" },
            blindspot: { de: "Übersieht strategischen Wert, der nicht in dieser Quartalsrechnung steht.",
                         en: "Misses strategic value that doesn't show up in this quarter's P&L." } },
  adrian: { stance:   { de: "Hat die Branche nicht im Reflex. Fragt das, was niemand sonst fragt.",
                        en: "Doesn't have the industry on reflex. Asks the thing no one else asks." },
            blindspot: { de: "Manchmal naiv — auf produktive Weise, manchmal nicht.",
                         en: "Sometimes naive — productively, sometimes not." } },
  lia:    { stance:   { de: "Spricht aus dem Alltag. Reagiert auf Tonalität und Versprechen, nicht auf Strategie.",
                        en: "Speaks from everyday use. Reacts to tone and promise, not strategy." },
            blindspot: { de: "Vermischt persönliche Vorliebe mit Marktrepräsentativität.",
                         en: "Conflates personal preference with market representativeness." } }
};

const USE_CASES = [
  { slug: "products",
    title: { de: "Produkte",  en: "Products" },
    body:  { de: "Neue Features, Konzepte, Roadmap-Vorschläge — bevor sie in den Backlog wandern oder im Standup verteidigt werden müssen.",
             en: "New features, concepts, roadmap proposals — before they hit the backlog or have to be defended in standup." },
    fit:   { de: "Feature-Cuts · Positionierung · Pricing-Hypothesen", en: "Feature cuts · Positioning · Pricing hypotheses" },
    nofit: { de: "Marktgröße · Statistische Repräsentativität",        en: "Market sizing · Statistical representativeness" } },
  { slug: "websites",
    title: { de: "Websites",  en: "Websites" },
    body:  { de: "Landing-Pages, Hero-Copy, Funnel-Stages — bevor du Traffic drauflenkst und die Daten Wochen brauchen.",
             en: "Landing pages, hero copy, funnel stages — before you drive traffic and the data takes weeks." },
    fit:   { de: "Hero-Varianten · CTA-Klarheit · Tonalität",           en: "Hero variants · CTA clarity · Tone of voice" },
    nofit: { de: "A/B-Test-Ergebnisse · Performance-Benchmarks",        en: "A/B test results · Performance benchmarks" } },
  { slug: "designs",
    title: { de: "Designs",   en: "Designs" },
    body:  { de: "Visuals, Layout-Entscheidungen, Brand-Richtungen — bevor sie in Production gehen oder das Designsystem prägen.",
             en: "Visuals, layout decisions, brand directions — before they hit production or shape the design system." },
    fit:   { de: "Brand-Richtungen · Visual Tone · Layout-Hypothesen", en: "Brand directions · Visual tone · Layout hypotheses" },
    nofit: { de: "Usability-Testing · Eye-Tracking",                   en: "Usability testing · Eye-tracking" } }
];

const METHOD_STEPS = [
  { num: "01", label: { de: "Setup",     en: "Setup" },     title: { de: "Briefing",        en: "Briefing" },
    body:  { de: "Konzept, Zielgruppe, offene Fragen. Standard-Set oder eigene Personas.",
             en: "Concept, audience, open questions. Standard set or custom personas." } },
  { num: "02", label: { de: "Runde 1",   en: "Round 1" },   title: { de: "Erste Reaktionen", en: "First reactions" },
    body:  { de: "Jede Persona reagiert aus ihrer Haltung heraus. Keine Konsensbildung.",
             en: "Each persona reacts from their stance. No premature consensus." } },
  { num: "03", label: { de: "Runde 2",   en: "Round 2" },   title: { de: "Pushback",         en: "Pushback" },
    body:  { de: "Personas widersprechen einander. Härte steuerbar von Resonanz bis Konfrontation.",
             en: "Personas push back on each other. Intensity from resonance to confrontation." } },
  { num: "04", label: { de: "Runde 3",   en: "Round 3" },   title: { de: "Priorisierung",    en: "Prioritisation" },
    body:  { de: "Was zählt wirklich? Die Synthese arbeitet die echten Spannungslinien raus.",
             en: "What actually matters? The synthesis surfaces the real tension lines." } },
  { num: "05", label: { de: "Output",    en: "Output" },    title: { de: "Abschlussbericht", en: "Final report" },
    body:  { de: "PDF mit Synthesen, Spannungslinien und priorisierter Handlungsliste.",
             en: "PDF with syntheses, tension lines, and a prioritised action list." } }
];

const FAQS = [
  { q: { de: "Sind die Personas echte Menschen?", en: "Are the personas real people?" },
    a: { de: "Nein. Es sind konstruierte KI-Charaktere mit klaren Haltungen, Triggern und Blindspots. Sie ersetzen keine echte Marktforschung — sie ersetzen die improvisierte Diskussion davor.",
         en: "No. They're constructed AI characters with clear stances, triggers, and blind spots. They don't replace real research — they replace the improvised discussion before it." } },
  { q: { de: "Wie unterscheidet sich Syn von einem normalen LLM-Chat?", en: "How is Syn different from a regular LLM chat?" },
    a: { de: "Ein Chat ist ein Universal-Assistent, der dir tendenziell zustimmt. Syn ist ein moderiertes Format mit fünf eigenständigen Stimmen, drei strukturierten Runden und einem priorisierten Abschlussbericht — auf ein konkretes Konzept hin.",
         en: "A chat is a universal assistant that tends to agree with you. Syn is a moderated format with five distinct voices, three structured rounds, and a prioritised final report — focused on one concrete concept." } },
  { q: { de: "Wem gehören meine Daten?", en: "Who owns my data?" },
    a: { de: "Dir. Briefings, Sessions und Berichte gehören deinem Account. Anthropic trainiert keine Modelle auf API-Inputs und -Outputs (Standard der Commercial Terms). Hosting in der EU.",
         en: "You. Briefings, sessions, and reports belong to your account. Anthropic does not train models on API inputs or outputs (default under Commercial Terms). Hosting in the EU." } },
  { q: { de: "Kann ich eigene Personas bauen?", en: "Can I build my own personas?" },
    a: { de: "Jederzeit, in jedem Plan. Du gibst Rolle, Haltung, Sprachstil und Tabus vor — Syn baut die Persona und prüft sie über mehrere Runden auf Konsistenz.",
         en: "Anytime, on every plan. You provide role, stance, language style, and taboos — Syn builds the persona and validates its consistency over multiple rounds." } },
  { q: { de: "Was passiert nach der Session?", en: "What happens after the session?" },
    a: { de: "Du bekommst einen Abschlussbericht als PDF mit Synthesen, Spannungslinien und priorisierter Handlungsliste. Jede Persona bleibt verfügbar — wenn du eine spannend fandst, kannst du sie 1:1 weiter befragen.",
         en: "You get a final report as PDF with syntheses, tension lines, and a prioritised action list. Each persona stays available — if you found one particularly insightful, you can keep talking to them 1:1." } }
];

const COPY = {
  nav: { de: { method: "Methodik", personas: "Personas", use: "Wofür", pricing: "Preise", faq: "FAQ", login: "Login", start: "Jetzt starten" },
         en: { method: "How it works", personas: "Personas", use: "Use cases", pricing: "Pricing", faq: "FAQ", login: "Log in", start: "Get started" } },
  hero: { de: { eyebrow: "Synthetische Fokusgruppen",
                title1: "Diskutier dein Konzept.",
                title2: "Heute.",
                title3: "Nicht in vier Wochen.",
                sub: "Bis zu fünf Personas mit eigenen Haltungen, bis zu drei Runden moderierter Diskurs, ein priorisierter Abschlussbericht. Zwischen Konzeptpapier und Creative Brief — bevor du Budget für Recruiting freigibst.",
                cta: "Jetzt starten →", meta: "⌀ 14 Min. pro Session" },
          en: { eyebrow: "Synthetic focus groups",
                title1: "Debate your concept.",
                title2: "Today.",
                title3: "Not in four weeks.",
                sub: "Up to five personas with their own stances, up to three rounds of moderated discourse, one prioritised final report. Between concept paper and creative brief — before you commit budget to recruiting.",
                cta: "Get started →", meta: "⌀ 14 min per session" } },
  demo: { de: { title: "Perspektiven zur Landing-Hero",
                metaPrefix: "Diskussion läuft",
                metaSuffix: "· 3 Personas · 2 Files",
                allSessions: "Alle Sessions" },
          en: { title: "Perspectives on the landing hero",
                metaPrefix: "Discussion live",
                metaSuffix: "· 3 personas · 2 files",
                allSessions: "All sessions" } },
  demoBubbles: {
    de: [
      { name: "Maya Reyes",  role: "Skeptische CMO",
        text: "„Heute statt vier Wochen“ klingt wie ein SaaS-Versprechen, das ich seit Jahren von zwölf Tools höre. Was ist hier konkret heute?" },
      { name: "Jonas Frei",  role: "Frühadopter PM",
        text: "Widerspruch. Die Headline tut genau das Richtige — sie benennt den Schmerzpunkt: vier Wochen Recruiting. Das ist konkret genug." },
      { name: "Noor Hassan", role: "Budget-Lead",
        text: "Mich interessiert nicht heute vs. vier Wochen. Mich interessiert: ersetzt das echte Studien oder nicht? Die Page muss das oben klären." }
    ],
    en: [
      { name: "Maya Reyes",  role: "Skeptical CMO",
        text: "“Today, not four weeks” sounds like a SaaS promise I've heard from twelve tools for years. What is concretely today here?" },
      { name: "Jonas Frei",  role: "Early-adopter PM",
        text: "Disagree. The headline does exactly the right thing — it names the pain: four weeks of recruiting. That is concrete enough." },
      { name: "Noor Hassan", role: "Budget lead",
        text: "I don't care about today vs. four weeks. I care: does this replace real research or not? The page has to clarify that up top." }
    ]
  },
  method: { de: { eyebrow: "Methodik", title1: "Eine Session, fünf Schritte —", title2: "nicht fünf Sessions.",
                  sub: "Briefing rein, Bericht raus. Drei Runden stehen dir zur Verfügung — was in jeder Runde passiert, bestimmst du. Vom freundlichen Stresstest bis zum harten Pushback." },
            en: { eyebrow: "How it works", title1: "One session, five steps —", title2: "not five sessions.",
                  sub: "Briefing in, report out. Three rounds at your disposal — what happens in each round is yours to define. From friendly stress-test to hard pushback." } },
  personas: { de: { eyebrow: "Das Standard-Set", title1: "Fünf Charaktere.", title2: "Fünf Blindspots.",
                    sub: "Du entscheidest, mit wem du diskutierst. Für jede Frage stellst du dein eigenes Panel zusammen — Rollen, Haltungen, Sprachstil, Tabus. Briefings, Dokumente und Visuals lädst du dazu, Syn baut die Personas darauf auf." },
              en: { eyebrow: "The standard set", title1: "Five characters.", title2: "Five blindspots.",
                    sub: "You decide who's in the room. Every persona is built for your case — roles, stances, language styles, taboos. Briefings, documents, and visuals you upload; Syn builds the personas on top." },
              blindspotLabel: { de: "Blindspot", en: "Blindspot" } },
  use: { de: { eyebrow: "Wofür · Wofür nicht", title1: "Bevor du es veröffentlichst,", title2: "lass es diskutieren.",
               sub: "Drei Phasen, in denen Syn deutlich präziser arbeitet als ein LLM-Chat — und drei, in denen du echte Marktforschung brauchst.",
               fit: "Stark bei", nofit: "Nicht bei" },
         en: { eyebrow: "Use cases · Non-use cases", title1: "Before you ship it,", title2: "let it be debated.",
               sub: "Three phases where Syn is meaningfully more precise than an LLM chat — and three where you need real market research.",
               fit: "Strong for", nofit: "Not for" } },
  trust: { de: { eyebrow: "Was Syn ist · was Syn nicht ist", title1: "Kein Chat.", title2: "Ein Format.",
                 h1: "Warum kein LLM-Chat", p1: "Ein Chat ist ein Universal-Assistent. Syn ist ein moderiertes Format mit festen Rollen, definierten Runden und einer strukturierten Output-Form. Personas widersprechen einander — nicht dir.",
                 h2: "Wie Personas konstruiert sind", p2: "Jede Persona hat Rolle, Haltung, Vokabular, Trigger und Blindspots — geprüft auf Konsistenz über mehrere Runden. Du baust eigene ab Pro: Rolle vorgeben, Tabus definieren, Sprachstil festlegen.",
                 h3: "Wem die Daten gehören", p3: "Dir. Briefings, Sessions und Berichte gehören deinem Account. Anthropic trainiert keine Modelle auf API-Inputs und -Outputs (Standard der Commercial Terms). Hosting in der EU.",
                 quote: "Syn ersetzt keine echte Marktforschung. Es ersetzt das, was du sonst mit Slack, einem Whiteboard und vier Kolleg:innen am Freitagnachmittag improvisierst.",
                 quoteAttr: "Methodik-Note · Worqshop" },
           en: { eyebrow: "What Syn is · what Syn isn't", title1: "Not a chat.", title2: "A format.",
                 h1: "Why not an LLM chat", p1: "A chat is a universal assistant. Syn is a moderated format with fixed roles, defined rounds, and a structured output form. Personas contradict each other — not you.",
                 h2: "How personas are constructed", p2: "Each persona has role, stance, vocabulary, triggers, and blind spots — validated for consistency over multiple rounds. You build your own from Pro: define the role, set taboos, fix the language style.",
                 h3: "Who owns the data", p3: "You. Briefings, sessions, and reports belong to your account. Anthropic does not train models on API inputs or outputs (default under Commercial Terms). Hosting in the EU.",
                 quote: "Syn doesn't replace real market research. It replaces what you'd otherwise improvise on a Friday afternoon with Slack, a whiteboard, and four colleagues.",
                 quoteAttr: "Method note · Worqshop" } },
  pricing: { de: { eyebrow: "Preise", title1: "Drei Pläne.", title2: "Transparent.",
                   sub: "Jährlich −20% sparen, monatlich für maximale Flexibilität. Keine versteckten Kosten, kein Setup." },
             en: { eyebrow: "Pricing", title1: "Three plans.", title2: "Transparent.",
                   sub: "Yearly saves 20%, monthly stays flexible. No hidden fees, no setup costs." } },
  faq: { de: { eyebrow: "Was du wissen willst", title1: "Häufige", title2: "Fragen." },
         en: { eyebrow: "What you want to know", title1: "Frequent", title2: "questions." } },
  finalCta: { de: { title: "Probier es an deinem nächsten Konzept.", cta: "Jetzt starten" },
              en: { title: "Try it on your next concept.", cta: "Get started" } },
  footer: { de: { tagline: "Synthetische Fokusgruppen — für jede Frage, jede Idee, jede Entscheidung.",
                  product: "Produkt", legal: "Recht", contact: "Kontakt",
                  about: "Über Worqshop", privacy: "Datenschutz", imprint: "Impressum", terms: "AGB",
                  status: "Status", builtBy: "© 2026 Syn · Ein Produkt von Worqshop", region: "DE · Hamburg / Berlin" },
            en: { tagline: "Synthetic focus groups — for every question, every idea, every decision.",
                  product: "Product", legal: "Legal", contact: "Contact",
                  about: "About Worqshop", privacy: "Privacy", imprint: "Imprint", terms: "Terms",
                  status: "Status", builtBy: "© 2026 Syn · A Worqshop product", region: "DE · Hamburg / Berlin" } }
};

const PERSONA_TINTS = ["#BE123C", "#D97706", "#0E7490", "#7C3AED", "#0891B2"];

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/app/dashboard");

  const locale: Locale = await getLocaleFromCookies();
  const t = COPY;

  return (
    <main className="min-h-screen" style={{ background: "#F4F1EA", color: "#1F2420" }}>

      {/* NAV */}
      <nav className="border-b sticky top-0 z-30 backdrop-blur-md" style={{ borderColor: "rgba(26,24,21,0.12)", background: "rgba(244,241,234,0.85)" }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/api/assets/syn-avatar" alt="Syn" className="w-7 h-7 rounded-full ring-1 ring-white/40 object-cover" />
              <span className="font-serif text-xl font-medium tracking-tight" style={{ color: "#1F2420" }}>Syn</span>
            </Link>
            <div className="hidden md:flex gap-7 text-sm" style={{ color: "#4A4640" }}>
              <a href="#method" className="hover:text-rose-700 transition-colors">{t.nav[locale].method}</a>
              <a href="#personas" className="hover:text-rose-700 transition-colors">{t.nav[locale].personas}</a>
              <a href="#use" className="hover:text-rose-700 transition-colors">{t.nav[locale].use}</a>
              <a href="#pricing" className="hover:text-rose-700 transition-colors">{t.nav[locale].pricing}</a>
              <a href="#faq" className="hover:text-rose-700 transition-colors">{t.nav[locale].faq}</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitch locale={locale} />
            <Link href="/login" className="hidden sm:inline text-sm hover:text-rose-700 transition-colors" style={{ color: "#4A4640" }}>{t.nav[locale].login}</Link>
            <Link href="/login" className="btn-primary px-4 py-2 rounded-md text-sm font-medium text-white">{t.nav[locale].start}</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="border-b" style={{ borderColor: "rgba(26,24,21,0.12)" }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-20 lg:py-24 grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.15em] mb-7 flex items-center gap-3" style={{ color: "#8A857C" }}>
              <span className="w-6 h-px" style={{ background: "#8A857C" }} />
              {t.hero[locale].eyebrow}
            </div>
            <h1 className="font-serif font-normal tracking-tight leading-[1.02] mb-7" style={{ fontSize: "clamp(40px, 6vw, 64px)" }}>
              {t.hero[locale].title1}<br />
              <em className="not-italic" style={{ color: "#BE123C", fontStyle: "italic", fontWeight: 400 }}>{t.hero[locale].title2}</em><br />
              {t.hero[locale].title3}
            </h1>
            <p className="text-[17px] leading-[1.55] mb-8 max-w-lg" style={{ color: "#4A4640" }}>
              {t.hero[locale].sub}
            </p>
            <div className="flex items-center gap-4">
              <Link href="/login" className="btn-primary inline-flex items-center px-5 py-3 rounded-md text-sm font-medium text-white">
                {t.hero[locale].cta}
              </Link>

            </div>
          </div>

          {/* DEMO CARD - mirrors the actual app chat shell */}
          <div className="rounded-md shadow-md overflow-hidden border" style={{ borderColor: "rgba(26,24,21,0.12)", background: "#F4F1EA" }}>
            <div className="px-6 py-4 border-b flex items-start justify-between gap-4" style={{ borderColor: "rgba(26,24,21,0.08)" }}>
              <div>
                <div className="font-serif text-[18px] font-medium tracking-tight" style={{ color: "#1F2420" }}>{t.demo[locale].title}</div>
                <div className="font-mono text-[11px] uppercase tracking-[0.05em] mt-1" style={{ color: "#3A7E58" }}>
                  <span className="font-semibold">{t.demo[locale].metaPrefix}</span>
                  <span style={{ color: "#8A857C" }}> {t.demo[locale].metaSuffix}</span>
                </div>
              </div>
              <span className="font-mono text-[11px] uppercase tracking-[0.05em] shrink-0" style={{ color: "#8A857C" }}>{t.demo[locale].allSessions}</span>
            </div>
            <div className="p-6 space-y-5">
              {t.demoBubbles[locale].map((b, i) => {
                const stops = [
                  { top: "#F472B6", bottom: "#BE123C", text: "#BE123C" },
                  { top: "#FBBF24", bottom: "#B45309", text: "#B45309" },
                  { top: "#34D399", bottom: "#047857", text: "#047857" }
                ][i];
                return (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 ring-1 ring-white/40"
                      style={{ background: `linear-gradient(180deg, ${stops.top}, ${stops.bottom})` }}>
                      <img src={`/api/assets/landing/persona-${PERSONAS[i].slug}`} alt={b.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] mb-1 flex items-baseline gap-2">
                        <span className="font-semibold" style={{ color: stops.text }}>{b.name}</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.05em]" style={{ color: "#8A857C" }}>{b.role}</span>
                      </div>
                      <div className="bubble-card py-3"
                        style={{ ['--edge-top' as string]: stops.top, ['--edge-bottom' as string]: stops.bottom } as React.CSSProperties}>
                        <p className="text-[13.5px] leading-[1.55]" style={{ color: "#3A3530" }}>{b.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* METHODIK */}
      <section id="method" className="border-b py-24" style={{ borderColor: "rgba(26,24,21,0.12)" }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <div className="max-w-2xl mb-16">
            <div className="font-mono text-[11px] uppercase tracking-[0.15em] mb-4 flex items-center gap-3" style={{ color: "#8A857C" }}>
              <span className="w-6 h-px" style={{ background: "#8A857C" }} />
              {t.method[locale].eyebrow}
            </div>
            <h2 className="font-serif font-normal text-4xl lg:text-5xl tracking-tight leading-[1.1] mb-4">
              {t.method[locale].title1} <em className="not-italic" style={{ color: "#BE123C", fontStyle: "italic" }}>{t.method[locale].title2}</em>
            </h2>
            <p className="text-[17px] max-w-lg leading-[1.55]" style={{ color: "#4A4640" }}>{t.method[locale].sub}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 border rounded-md bg-white overflow-hidden" style={{ borderColor: "rgba(26,24,21,0.12)" }}>
            {METHOD_STEPS.map((s, i) => (
              <div key={s.num} className={`p-7 ${i < 4 ? "md:border-r" : ""}`}
                style={{ borderColor: "rgba(26,24,21,0.12)", background: i === 4 ? "#FBF9F5" : undefined }}>
                <div className="font-mono text-[11px] tracking-[0.05em] mb-4" style={{ color: i === 4 ? "#BE123C" : "#8A857C" }}>
                  {s.num} · {s.label[locale]}
                </div>
                <h3 className="font-serif text-[19px] font-medium tracking-tight mb-2.5" style={{ color: "#1F2420" }}>{s.title[locale]}</h3>
                <p className="text-[13.5px] leading-[1.55]" style={{ color: "#4A4640" }}>{s.body[locale]}</p>
              </div>
            ))}
          </div>
          <p className="text-center font-mono text-[12px] mt-6 max-w-2xl mx-auto" style={{ color: "#8A857C" }}>
            {locale === "en"
              ? "Round titles above are an example. The content of each round is yours to define — what to focus on, how hard to push back, what to synthesise."
              : "Die Runden oben sind ein Beispiel. Was in jeder Runde passiert, bestimmst du — worauf der Fokus liegt, wie hart Pushback ist, was synthetisiert wird."}
          </p>
        </div>
      </section>

      {/* PERSONAS */}
      <section id="personas" className="border-b py-24" style={{ borderColor: "rgba(26,24,21,0.12)" }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <div className="max-w-2xl mb-16">
            <div className="font-mono text-[11px] uppercase tracking-[0.15em] mb-4 flex items-center gap-3" style={{ color: "#8A857C" }}>
              <span className="w-6 h-px" style={{ background: "#8A857C" }} />
              {t.personas[locale].eyebrow}
            </div>
            <h2 className="font-serif font-normal text-4xl lg:text-5xl tracking-tight leading-[1.1] mb-4">
              {t.personas[locale].title1} <em className="not-italic" style={{ color: "#BE123C", fontStyle: "italic" }}>{t.personas[locale].title2}</em>
            </h2>
            <p className="text-[17px] max-w-lg leading-[1.55]" style={{ color: "#4A4640" }}>{t.personas[locale].sub}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-px rounded-md bg-white overflow-hidden border" style={{ background: "rgba(26,24,21,0.12)", borderColor: "rgba(26,24,21,0.12)" }}>
            {PERSONAS.map((p, i) => {
              const s = PERSONA_STANCES[p.slug];
              return (
                <div key={p.slug} className="bg-white p-7 transition-colors hover:bg-stone-50 flex flex-col">
                  <div className="mb-5 relative">
                    <img src={`/api/assets/landing/persona-${p.slug}`} alt={p.name}
                      className="w-14 h-14 rounded-full object-cover ring-2"
                      style={{ boxShadow: `0 0 0 1px ${PERSONA_TINTS[i]}33` }} />
                  </div>
                  <h3 className="font-serif text-[19px] font-medium tracking-tight mb-1" style={{ color: "#1F2420" }}>{p.name}</h3>
                  <div className="font-mono text-[11px] uppercase tracking-[0.05em] mb-4" style={{ color: "#8A857C" }}>{p.role[locale]}</div>
                  <p className="text-[13px] leading-[1.55] mb-4" style={{ color: "#4A4640", height: "calc(4 * 1.55 * 13px)" }}>{s.stance[locale]}</p>
                  <div className="mt-auto pt-4 border-t" style={{ borderColor: "rgba(26,24,21,0.12)" }}>
                    <div className="font-mono text-[10px] uppercase tracking-[0.05em] font-medium mb-1" style={{ color: "#4A4640" }}>
                      {t.personas.blindspotLabel[locale]}
                    </div>
                    <p className="text-[12px] leading-[1.5]" style={{ color: "#8A857C", height: "calc(3 * 1.5 * 12px)" }}>{s.blindspot[locale]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section id="use" className="border-b py-24" style={{ borderColor: "rgba(26,24,21,0.12)" }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <div className="max-w-2xl mb-16">
            <div className="font-mono text-[11px] uppercase tracking-[0.15em] mb-4 flex items-center gap-3" style={{ color: "#8A857C" }}>
              <span className="w-6 h-px" style={{ background: "#8A857C" }} />
              {t.use[locale].eyebrow}
            </div>
            <h2 className="font-serif font-normal text-4xl lg:text-5xl tracking-tight leading-[1.1] mb-4">
              {t.use[locale].title1} <em className="not-italic" style={{ color: "#BE123C", fontStyle: "italic" }}>{t.use[locale].title2}</em>
            </h2>
            <p className="text-[17px] max-w-lg leading-[1.55]" style={{ color: "#4A4640" }}>{t.use[locale].sub}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {USE_CASES.map((u) => (
              <div key={u.slug} className="rounded-md overflow-hidden bg-white border flex flex-col" style={{ borderColor: "rgba(26,24,21,0.12)" }}>
                <div className="w-full aspect-[16/9] overflow-hidden" style={{ background: "#1A1815" }}>
                  <img src={`/api/assets/landing/${u.slug}`} alt="" className="w-full h-full object-cover object-center" style={{ imageRendering: "auto" }} />
                </div>
                <div className="p-7 flex-1 flex flex-col">
                  <h3 className="font-serif text-[22px] font-medium tracking-tight mb-3" style={{ color: "#1F2420" }}>{u.title[locale]}</h3>
                  <p className="text-[14px] leading-[1.55] mb-5" style={{ color: "#4A4640", height: "calc(4 * 1.55 * 14px)" }}>{u.body[locale]}</p>
                  <div className="mt-auto pt-4 border-t font-mono text-[11px] leading-[1.5]" style={{ borderColor: "rgba(26,24,21,0.12)", color: "#3A7E58" }}>
                    <div className="font-medium uppercase tracking-[0.05em] mb-1.5">{t.use[locale].fit}</div>
                    <div className="mb-3" style={{ height: "calc(2 * 1.5 * 11px)" }}>{u.fit[locale]}</div>
                    <div className="font-medium uppercase tracking-[0.05em] mb-1.5" style={{ color: "#8A857C" }}>{t.use[locale].nofit}</div>
                    <div style={{ color: "#8A857C", height: "calc(2 * 1.5 * 11px)" }}>{u.nofit[locale]}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* METHOD / TRUST */}
      <section className="border-b py-24" style={{ borderColor: "rgba(26,24,21,0.12)" }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.15em] mb-4 flex items-center gap-3" style={{ color: "#8A857C" }}>
              <span className="w-6 h-px" style={{ background: "#8A857C" }} />
              {t.trust[locale].eyebrow}
            </div>
            <h2 className="font-serif font-normal text-4xl tracking-tight leading-[1.1] mb-12">
              {t.trust[locale].title1} <em className="not-italic" style={{ color: "#BE123C", fontStyle: "italic" }}>{t.trust[locale].title2}</em>
            </h2>
            <div className="space-y-7">
              {(["h1", "h2", "h3"] as const).map((k, i) => (
                <div key={k} className={`pb-7 ${i < 2 ? "border-b" : ""}`} style={{ borderColor: "rgba(26,24,21,0.12)" }}>
                  <h3 className="font-serif text-[22px] font-medium tracking-tight mb-2.5" style={{ color: "#1F2420" }}>
                    {t.trust[locale][k as "h1" | "h2" | "h3"]}
                  </h3>
                  <p className="text-[15px] leading-[1.6]" style={{ color: "#4A4640" }}>
                    {t.trust[locale][`p${i + 1}` as "p1" | "p2" | "p3"]}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-md p-12 lg:p-14" style={{ background: "#1A1815", color: "#F4F1EA" }}>
            <p className="font-serif text-[24px] lg:text-[26px] leading-[1.45] italic tracking-tight">{t.trust[locale].quote}</p>
            <div className="mt-8 font-mono text-[12px] uppercase tracking-[0.05em]" style={{ color: "#E8C9B5" }}>
              — {t.trust[locale].quoteAttr}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-b py-24" style={{ borderColor: "rgba(26,24,21,0.12)", background: "#EFEBE2" }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <div className="max-w-2xl mb-12">
            <div className="font-mono text-[11px] uppercase tracking-[0.15em] mb-4 flex items-center gap-3" style={{ color: "#8A857C" }}>
              <span className="w-6 h-px" style={{ background: "#8A857C" }} />
              {t.pricing[locale].eyebrow}
            </div>
            <h2 className="font-serif font-normal text-4xl lg:text-5xl tracking-tight leading-[1.1] mb-4">
              {t.pricing[locale].title1} <em className="not-italic" style={{ color: "#BE123C", fontStyle: "italic" }}>{t.pricing[locale].title2}</em>
            </h2>
            <p className="text-[17px] max-w-lg leading-[1.55]" style={{ color: "#4A4640" }}>{t.pricing[locale].sub}</p>
          </div>
          <PricingSwitcher locale={locale} />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b py-24" style={{ borderColor: "rgba(26,24,21,0.12)" }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <div className="max-w-2xl mb-12">
            <div className="font-mono text-[11px] uppercase tracking-[0.15em] mb-4 flex items-center gap-3" style={{ color: "#8A857C" }}>
              <span className="w-6 h-px" style={{ background: "#8A857C" }} />
              {t.faq[locale].eyebrow}
            </div>
            <h2 className="font-serif font-normal text-4xl lg:text-5xl tracking-tight leading-[1.1]">
              {t.faq[locale].title1} <em className="not-italic" style={{ color: "#BE123C", fontStyle: "italic" }}>{t.faq[locale].title2}</em>
            </h2>
          </div>
          <div className="max-w-3xl">
            {FAQS.map((f, i) => (
              <div key={i} className="py-7 border-b" style={{ borderColor: "rgba(26,24,21,0.12)", borderTop: i === 0 ? "1px solid rgba(26,24,21,0.12)" : undefined }}>
                <h3 className="font-serif text-[20px] font-medium tracking-tight mb-3.5 flex justify-between items-baseline gap-4">
                  <span style={{ color: "#1F2420" }}>{f.q[locale]}</span>
                  <span className="font-mono text-[11px] font-normal" style={{ color: "#8A857C" }}>0{i + 1}</span>
                </h3>
                <p className="text-[15px] leading-[1.6] max-w-2xl" style={{ color: "#4A4640" }}>{f.a[locale]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 text-center">
          <h2 className="font-serif font-normal text-3xl lg:text-4xl tracking-tight leading-[1.15] mb-7 max-w-xl mx-auto" style={{ color: "#1F2420" }}>
            {t.finalCta[locale].title}
          </h2>
          <Link href="/login" className="btn-primary inline-block px-7 py-3.5 rounded-md text-[15px] font-medium text-white">
            {t.finalCta[locale].cta}
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t py-16" style={{ borderColor: "rgba(26,24,21,0.12)" }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-16">
            <div>
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <img src="/api/assets/syn-avatar" alt="" className="w-7 h-7 rounded-full ring-1 ring-white/40 object-cover" />
                <span className="font-serif text-xl font-medium tracking-tight" style={{ color: "#1F2420" }}>Syn</span>
              </Link>
              <p className="text-sm leading-[1.55] max-w-xs" style={{ color: "#4A4640" }}>{t.footer[locale].tagline}</p>
            </div>
            <div>
              <h4 className="font-mono text-[11px] uppercase tracking-[0.05em] font-medium mb-4" style={{ color: "#8A857C" }}>{t.footer[locale].product}</h4>
              <ul className="space-y-2.5 text-sm" style={{ color: "#4A4640" }}>
                <li><a href="#method" className="hover:text-rose-700 transition-colors">{t.nav[locale].method}</a></li>
                <li><a href="#personas" className="hover:text-rose-700 transition-colors">{t.nav[locale].personas}</a></li>
                <li><a href="#use" className="hover:text-rose-700 transition-colors">{t.nav[locale].use}</a></li>
                <li><a href="#pricing" className="hover:text-rose-700 transition-colors">{t.nav[locale].pricing}</a></li>
                <li><a href="#faq" className="hover:text-rose-700 transition-colors">{t.nav[locale].faq}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-[11px] uppercase tracking-[0.05em] font-medium mb-4" style={{ color: "#8A857C" }}>{t.footer[locale].legal}</h4>
              <ul className="space-y-2.5 text-sm" style={{ color: "#4A4640" }}>
                <li><Link href="/impressum" className="hover:text-rose-700 transition-colors">{t.footer[locale].imprint}</Link></li>
                <li><Link href="/datenschutz" className="hover:text-rose-700 transition-colors">{t.footer[locale].privacy}</Link></li>
                <li><Link href="/agb" className="hover:text-rose-700 transition-colors">{t.footer[locale].terms}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-[11px] uppercase tracking-[0.05em] font-medium mb-4" style={{ color: "#8A857C" }}>{t.footer[locale].contact}</h4>
              <ul className="space-y-2.5 text-sm" style={{ color: "#4A4640" }}>
                <li><a href="mailto:hello@asksyn.com" className="hover:text-rose-700 transition-colors">hello@asksyn.com</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col sm:flex-row justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.05em]" style={{ borderColor: "rgba(26,24,21,0.12)", color: "#8A857C" }}>
            <span>{t.footer[locale].builtBy}</span>
            <span>{t.footer[locale].region}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

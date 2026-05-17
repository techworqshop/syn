import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getLocaleFromCookies, type Locale } from "@/lib/i18n";
import { auth } from "@/lib/auth";
import LanguageSwitch from "@/components/LanguageSwitch";

export const dynamic = "force-dynamic";

// Root: Marketing-Landing fuer Anonyme, redirect zum Dashboard fuer
// Eingeloggte. Marketing-Inhalte sind direkt unter `/` erreichbar
// (asksyn.com/ statt asksyn.com/landing). — wird spaeter zur asksin.com Root. Layout
// folgt dem v3 Mockup, Bilder werden zur Build-Zeit von Gemini erzeugt
// und unter /api/assets/landing/{name} ausgeliefert.
export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/app/dashboard");

  // Host-aware: auf der oeffentlichen Verkaufs-Domain (asksyn.com) blenden
  // wir Preise + Pricing-Details aus, weil die noch nicht final sind. Auf
  // dem Dev-Deployment (worqshop.io) bleibt der volle Inhalt.
  const h = await headers();
  const host = (h.get("host") || "").toLowerCase();
  const isDev = host.includes("worqshop.io");

  const locale = await getLocaleFromCookies();
  const c = LANDING_COPY[locale];

  return (
    <main className="min-h-screen" style={{ background: "#E8E2D2", color: "#1F2420", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>

      {/* Nav — Links: Logo + Nav-Items zusammen gruppiert. Rechts: Lang + Login + CTA. */}
      <nav className="flex items-center justify-between px-7 py-3.5 sticky top-0 z-30"
        style={{ background: "rgba(243,239,226,0.7)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.5)" }}>
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/api/assets/syn-avatar" alt="Syn"
              className="w-7 h-7 rounded-full ring-1 ring-white/40 object-cover" />
            <span className="font-semibold text-lg tracking-tight" style={{ color: "#BE123C" }}>Syn</span>
          </Link>
          <div className="hidden md:flex gap-6 items-center text-sm" style={{ color: "#4A4640" }}>
            <a href="#how" className="hover:text-stone-900 transition-colors">{c.nav.how}</a>
            <a href="#pricing" className="hover:text-stone-900 transition-colors">{c.nav.pricing}</a>
            <a href="#faq" className="hover:text-stone-900 transition-colors">{c.nav.faq}</a>
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <LanguageSwitch locale={locale} />
          <Link href="/login" className="hidden sm:inline text-sm hover:text-stone-900 transition-colors" style={{ color: "#4A4640" }}>{c.nav.login}</Link>
          <Link href="/login" className="btn-primary px-4 py-2 rounded-lg text-sm font-medium">{c.nav.start}</Link>
        </div>
      </nav>

      {/* Hero — Logo prominent als grosses Wasserzeichen-artiges Element */}
      <section className="relative max-w-4xl mx-auto px-8 pt-28 pb-24 text-center">
        <div className="flex justify-center mb-10">
          <div className="relative">
            <img src="/api/assets/syn-avatar" alt=""
              className="w-32 h-32 md:w-40 md:h-40 rounded-full ring-2 ring-white/40 shadow-xl" />
            {/* Glow-Ring */}
            <div className="absolute inset-0 rounded-full pointer-events-none"
              style={{ boxShadow: "0 0 80px -10px rgba(190,18,60,0.25)" }} />
          </div>
        </div>
        <h1 className="font-semibold tracking-tight leading-[1.08] mb-6" style={{ fontSize: "clamp(36px, 6vw, 54px)" }}>
          {c.hero.title}
        </h1>
        <p className="text-lg mx-auto max-w-xl leading-relaxed" style={{ color: "#4A4640" }}>
          {c.hero.sub}
        </p>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-5xl mx-auto px-8 py-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3 text-center" style={{ color: "#7A7268" }}>{c.how.label}</p>
        <h2 className="text-3xl font-semibold tracking-tight mb-3 text-center" style={{ color: "#1F2420" }}>{c.how.title}</h2>
        <p className="text-[15px] mx-auto max-w-xl text-center mb-10 leading-relaxed" style={{ color: "#7A7268" }}>{c.how.intro}</p>
        <div className="grid md:grid-cols-3 gap-4">
          {c.how.steps.map((s, i) => (
            <div key={i} className="relative rounded-2xl overflow-hidden p-8 px-6 pl-7"
              style={{ background: "#F3EFE2", border: "1px solid rgba(31,36,32,0.06)" }}>
              <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1"
                style={{ background: STEP_GRADIENTS[i] }} />
              <p className="text-[13px] font-semibold tracking-wide mb-2" style={{ color: "#7A7268" }}>{s.round}</p>
              <h3 className="text-lg font-semibold mb-2 tracking-tight" style={{ color: "#1F2420" }}>{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#4A4640" }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases mit echten Gemini-Bildern */}
      <section className="py-16" style={{ background: "#DDD3BC" }}>
        <div className="max-w-5xl mx-auto px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3 text-center" style={{ color: "#7A7268" }}>{c.use.label}</p>
          <h2 className="text-3xl font-semibold tracking-tight mb-3 text-center" style={{ color: "#1F2420" }}>{c.use.title}</h2>
          <p className="text-[15px] mx-auto max-w-xl text-center mb-10 leading-relaxed" style={{ color: "#7A7268" }}>{c.use.intro}</p>
          <div className="grid md:grid-cols-3 gap-4">
            {c.use.cards.map((card, i) => (
              <div key={i} className="rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "#F3EFE2", border: "1px solid rgba(31,36,32,0.06)" }}>
                <img src={`/api/assets/landing/${USE_SLUGS[i]}`} alt=""
                  className="w-full h-40 object-cover" />
                <div className="p-6 flex-1">
                  <p className="text-[17px] font-semibold mb-2" style={{ color: "#1F2420" }}>{card.title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#4A4640" }}>{card.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tension statement mit Logo-Element */}
      <section className="max-w-3xl mx-auto px-8 py-20 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3" style={{ color: "#7A7268" }}>{c.tension.label}</p>
        <h2 className="text-3xl font-semibold tracking-tight mb-8" style={{ color: "#1F2420" }}>{c.tension.title}</h2>
        <p className="text-[17px] leading-relaxed" style={{ color: "#4A4640" }}>{c.tension.body}</p>
      </section>

      {/* Pricing — host-aware: Production zeigt Beta-Placeholder, Dev volle Karten */}
      <section id="pricing" className="py-16" style={{ background: "#DDD3BC" }}>
        <div className="max-w-5xl mx-auto px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3 text-center" style={{ color: "#7A7268" }}>{c.pricing.label}</p>
          <h2 className="text-3xl font-semibold tracking-tight mb-10 text-center" style={{ color: "#1F2420" }}>{isDev ? c.pricing.title : c.pricing.comingTitle}</h2>
          {!isDev && (
            <div className="max-w-2xl mx-auto">
              <div className="relative rounded-2xl overflow-hidden p-10 text-center"
                style={{ background: "#F3EFE2", border: "1px solid rgba(31,36,32,0.06)" }}>
                <span aria-hidden className="absolute top-0 left-0 right-0"
                  style={{ height: "4px", background: "linear-gradient(90deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)" }} />
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-white mb-4"
                  style={{ background: "linear-gradient(180deg, #4C1D95, #BE123C)" }}>
                  {c.pricing.comingBadge}
                </span>
                <h3 className="text-2xl font-semibold tracking-tight mb-3" style={{ color: "#1F2420" }}>{c.pricing.comingHeadline}</h3>
                <p className="text-[15px] leading-relaxed mb-7 max-w-md mx-auto" style={{ color: "#4A4640" }}>{c.pricing.comingBody}</p>
                <Link href="/register" className="btn-primary inline-block px-8 py-3.5 rounded-xl font-medium text-[15px]">
                  {c.pricing.comingCta}
                </Link>
              </div>
            </div>
          )}
          {isDev && (
          <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {c.pricing.tiers.map((tier, i) => (
              <div key={tier.name}
                className={`relative rounded-2xl overflow-hidden flex flex-col ${tier.featured ? "md:-translate-y-2" : ""}`}
                style={{ background: "#F3EFE2", border: "1px solid rgba(31,36,32,0.06)" }}>
                <div className="h-1 w-full" style={{ background: TIER_STRIPES[i] }} />
                {tier.featured && (
                  <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full text-white"
                    style={{ background: "linear-gradient(180deg, #4C1D95, #BE123C)" }}>
                    {c.pricing.popular}
                  </span>
                )}
                <div className="p-6 flex flex-col flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#7A7268" }}>{tier.name}</p>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-4xl font-semibold tracking-tight" style={{ color: "#1F2420" }}>{tier.price}</span>
                    <span className="text-sm" style={{ color: "#7A7268" }}>{c.pricing.perMonth}</span>
                  </div>
                  <p className="text-sm mb-5" style={{ color: "#4A4640" }}>{tier.quota}</p>
                  <ul className="space-y-2 flex-1 mb-6">
                    {tier.features.map((f, k) => (
                      <li key={k} className="flex items-start gap-2 text-sm" style={{ color: "#4A4640" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#3A7E58" strokeWidth="2.5" className="w-4 h-4 mt-0.5 shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/login" className={`block w-full text-center py-2.5 rounded-lg text-sm font-medium transition-colors ${tier.featured ? "btn-primary text-white" : ""}`}
                    style={!tier.featured ? { background: "#1F2420", color: "#F3EFE2" } : undefined}>
                    {tier.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-8 py-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3 text-center" style={{ color: "#7A7268" }}>{c.faq.label}</p>
        <h2 className="text-3xl font-semibold tracking-tight mb-8 text-center" style={{ color: "#1F2420" }}>{c.faq.title}</h2>
        <div className="space-y-2.5">
          {c.faq.items.map((item, i) => (
            <details key={i} className="group rounded-xl transition-colors"
              style={{ background: "#F3EFE2", border: "1px solid rgba(31,36,32,0.06)" }}>
              <summary className="cursor-pointer px-5 py-4 flex justify-between items-center font-medium text-[15px] list-none"
                style={{ color: "#1F2420" }}>
                <span>{item.q}</span>
                <span className="text-2xl font-light group-open:rotate-45 transition-transform" style={{ color: "#7A7268" }}>+</span>
              </summary>
              <p className="px-5 pb-4 text-sm leading-relaxed" style={{ color: "#4A4640" }}>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 text-center text-white"
        style={{ background: "linear-gradient(135deg, #4C1D95 0%, #9F1239 60%, #BE123C 100%)" }}>
        <div className="max-w-3xl mx-auto px-8">
          <img src="/api/assets/syn-avatar" alt=""
            className="w-16 h-16 mx-auto mb-6 rounded-full ring-2 ring-white/30 shadow-lg" />
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3 leading-tight">{c.finalCta.title}</h2>
          <Link href="/login"
            className="inline-block px-8 py-3.5 rounded-xl font-medium text-[15px] transition-all"
            style={{ background: "#F3EFE2", color: "#4C1D95" }}>
            {c.finalCta.cta}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8" style={{ background: "#1F2420", color: "#B4B2A9" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <img src="/api/assets/syn-avatar" alt="" className="w-6 h-6 rounded-full" />
                <span className="font-semibold text-[#F3EFE2]">Syn</span>
              </div>
              <p className="text-xs leading-relaxed">{c.footer.tagline}</p>
            </div>
            {c.footer.cols.map((col, i) => (
              <div key={i}>
                <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "#F3EFE2" }}>{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((l, k) => (
                    <li key={k}>
                      <a href={l.href} className="text-[13px] hover:text-[#F3EFE2] transition-colors">{l.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-white/10 flex justify-between text-xs" style={{ color: "#7A7268" }}>
            <span>© {new Date().getFullYear()} Syn · {c.footer.builtBy}</span>
            <span>{locale === "de" ? "DE" : "EN"}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

const STEP_GRADIENTS = [
  "linear-gradient(180deg, #DBA947, #A77E22)",   // Mustard
  "linear-gradient(180deg, #3A7E58, #144A2C)",   // Deep Emerald
  "linear-gradient(180deg, #913B4F, #4F1A28)"    // Bordeaux
];

const TIER_STRIPES = [
  "linear-gradient(90deg, #DBA947, #A77E22)",
  "linear-gradient(90deg, #4C1D95, #9F1239, #BE123C)",
  "linear-gradient(90deg, #913B4F, #4F1A28)"
];

const USE_SLUGS = ["products", "websites", "designs"];

type LandingCopy = {
  nav: { how: string; pricing: string; faq: string; login: string; start: string };
  hero: { title: string; sub: string };
  how: { label: string; title: string; intro: string; steps: Array<{ round: string; title: string; body: string }> };
  use: { label: string; title: string; intro: string; cards: Array<{ title: string; body: string }> };
  tension: { label: string; title: string; body: string };
  pricing: { label: string; title: string; comingTitle: string; comingBadge: string; comingHeadline: string; comingBody: string; comingCta: string; popular: string; perMonth: string; tiers: Array<{ name: string; price: string; quota: string; features: string[]; cta: string; featured?: boolean }> };
  faq: { label: string; title: string; items: Array<{ q: string; a: string }> };
  finalCta: { title: string; cta: string };
  footer: { tagline: string; builtBy: string; cols: Array<{ title: string; links: Array<{ label: string; href: string }> }> };
};

const LANDING_COPY: Record<Locale, LandingCopy> = {
  de: {
    nav: { how: "Funktionsweise", pricing: "Preise", faq: "FAQ", login: "Login", start: "Jetzt starten" },
    hero: {
      title: "Diskutier dein Konzept. Heute. Nicht in vier Wochen.",
      sub: "Fünf Perspektiven, drei Runden, ein Abschlussbericht. Ohne Recruiting, ohne Konferenzraum."
    },
    how: {
      label: "Wie es funktioniert",
      title: "Du gibst die Methodik.",
      intro: "Syn ist ein anpassbares Diskursformat. Anzahl der Runden, Persona-Profile und Synthesetiefe bestimmst du.",
      steps: [
        { round: "Bis zu 3", title: "Runden",    body: "Du entscheidest, wie viele Diskussions-Runden es gibt und was in jeder Runde besprochen wird." },
        { round: "Bis zu 5", title: "Personas",  body: "Eigenständige Charaktere mit klar abgegrenzten Haltungen. Standard-Set oder eigene Personas — deine Wahl." },
        { round: "Bis zu 3", title: "Synthesen", body: "Jede Runde wird zu einer Synthese verdichtet. Im Abschlussbericht gebündelt als priorisierte Handlungsliste." }
      ]
    },
    use: {
      label: "Wann du es benutzt",
      title: "Bevor du es veröffentlichst, lass es diskutieren.",
      intro: "Drei Anwendungsfälle, bei denen Syn am stärksten ist.",
      cards: [
        { title: "Produkte",  body: "Neue Features, Konzepte, Roadmap-Vorschläge — bevor sie in den Backlog wandern." },
        { title: "Websites",  body: "Landing-Pages, Hero-Copy, Funnels — bevor du Traffic drauflenkst." },
        { title: "Designs",   body: "Visuals, Layouts, Branding-Entscheidungen — bevor sie in Production gehen." }
      ]
    },
    tension: {
      label: "Was anders ist",
      title: "Echte Diskussionen, keine Höflichkeitsfloskeln.",
      body: "Die Personas widersprechen einander, nicht dir. Du steuerst, wie hart sie das tun — von freundlicher Resonanz bis zu kompromisslosem Pushback."
    },
    pricing: {
      label: "Preise",
      title: "Drei Pläne. Transparent.",
      comingTitle: "Beta — Preise folgen.",
      comingBadge: "Beta",
      comingHeadline: "Aktuell im Closed-Beta.",
      comingBody: "Wir feilen noch an Personas, Synthesen und Methodik. Sobald wir live gehen, geben wir die Pläne und Preise frei.",
      comingCta: "Beta-Zugang anfragen",
      popular: "Beliebt",
      perMonth: "/Monat",
      tiers: [
        { name: "Solo",  price: "39 €",  quota: "2 Audiences pro Monat",
          features: ["Standard-Personas", "Drei Diskussions-Runden", "Abschlussbericht als PDF", "1:1-Follow-Up je Persona"],
          cta: "Solo wählen" },
        { name: "Pro",   price: "199 €", quota: "10 Audiences pro Monat", featured: true,
          features: ["Alles aus Solo", "Eigene Personas bauen", "Share-Links für Stakeholder", "Rigidity-Steuerung"],
          cta: "Pro wählen" },
        { name: "Team",  price: "499 €", quota: "30 Audiences pro Monat",
          features: ["Alles aus Pro", "Team-Workspaces", "API-Zugang", "Priority-Support"],
          cta: "Team wählen" }
      ]
    },
    faq: {
      label: "Häufige Fragen",
      title: "Was du wissen willst.",
      items: [
        { q: "Sind die Personas echte Menschen?",
          a: "Nein. Es sind AI-generierte Charaktere mit klaren Haltungen, Triggern und Blindspots. Sie ersetzen keine echte Marktforschung, sondern beschleunigen die Phase davor." },
        { q: "Wie unterscheidet sich Syn von einem normalen LLM-Chat?",
          a: "Ein LLM-Chat ist ein Universal-Assistent. Syn ist ein moderierter Diskursraum: fünf eigenständige Personas mit klar abgegrenzten Haltungen, strukturierte Runden, ein Abschlussbericht — alles auf ein konkretes Konzept hin." },
        { q: "Wem gehören meine Daten?",
          a: "Dir. Briefings, Sessions und Berichte gehören deinem Account. Wir trainieren keine Modelle auf deinen Inhalten." },
        { q: "Kann ich eigene Personas bauen?",
          a: "Ab dem Pro-Plan. Du gibst Rolle, Haltung, Sprachstil und Tabus vor — Syn baut die Persona und prüft sie auf Konsistenz." },
        { q: "Was passiert nach der Session?",
          a: "Du bekommst einen Abschlussbericht als PDF. Jede Persona bleibt verfügbar — wenn du eine besonders spannend fandst, kannst du sie nachträglich 1:1 weiter befragen." }
      ]
    },
    finalCta: { title: "Probier es an deinem nächsten Konzept.", cta: "Jetzt starten" },
    footer: {
      tagline: "Synthetische Fokusgruppen für Konzepte, die noch nicht raus sind.",
      builtBy: "Ein Produkt von Worqshop",
      cols: [
        { title: "Produkt", links: [{ label: "Funktionsweise", href: "#how" }, { label: "Preise", href: "#pricing" }, { label: "FAQ", href: "#faq" }] },
        { title: "Recht",   links: [{ label: "Impressum", href: "/impressum" }, { label: "Datenschutz", href: "/datenschutz" }, { label: "AGB", href: "/agb" }] },
        { title: "Kontakt", links: [{ label: "hello@asksyn.com", href: "mailto:hello@asksyn.com" }, { label: "Status", href: "#" }] }
      ]
    }
  },
  en: {
    nav: { how: "How it works", pricing: "Pricing", faq: "FAQ", login: "Log in", start: "Get started" },
    hero: {
      title: "Debate your concept. Today. Not in four weeks.",
      sub: "Five perspectives, three rounds, one final report. No recruiting, no conference room."
    },
    how: {
      label: "How it works",
      title: "You set the method.",
      intro: "Syn is a customizable discourse format. You decide the round count, persona profiles, and synthesis depth.",
      steps: [
        { round: "Up to 3", title: "Rounds",     body: "Decide how many discussion rounds there are and what each round explores." },
        { round: "Up to 5", title: "Personas",   body: "Distinct characters with clearly defined stances. Standard set or build your own — your call." },
        { round: "Up to 3", title: "Syntheses",  body: "Each round gets compressed into a synthesis. The final report bundles them into a prioritised action list." }
      ]
    },
    use: {
      label: "When to use it",
      title: "Before you ship it, let it be debated.",
      intro: "Three use cases where Syn is strongest.",
      cards: [
        { title: "Products", body: "New features, concepts, roadmap proposals — before they go into the backlog." },
        { title: "Websites", body: "Landing pages, hero copy, funnels — before you drive traffic to them." },
        { title: "Designs",  body: "Visuals, layouts, branding decisions — before they hit production." }
      ]
    },
    tension: {
      label: "What's different",
      title: "Real debates, no polite hedging.",
      body: "The personas contradict each other, not you. You steer how hard they push — from friendly resonance to uncompromising pushback."
    },
    pricing: {
      label: "Pricing",
      title: "Three plans. Transparent.",
      comingTitle: "Beta — pricing to follow.",
      comingBadge: "Beta",
      comingHeadline: "Currently in closed beta.",
      comingBody: "We're still refining personas, syntheses, and methodology. Once we launch, plans and pricing will be published.",
      comingCta: "Request beta access",
      popular: "Popular",
      perMonth: "/month",
      tiers: [
        { name: "Solo",  price: "€39",  quota: "2 audiences per month",
          features: ["Standard personas", "Three discussion rounds", "Final report as PDF", "1:1 follow-up per persona"],
          cta: "Choose Solo" },
        { name: "Pro",   price: "€199", quota: "10 audiences per month", featured: true,
          features: ["Everything in Solo", "Build custom personas", "Share links for stakeholders", "Rigidity control"],
          cta: "Choose Pro" },
        { name: "Team",  price: "€499", quota: "30 audiences per month",
          features: ["Everything in Pro", "Team workspaces", "API access", "Priority support"],
          cta: "Choose Team" }
      ]
    },
    faq: {
      label: "Frequent questions",
      title: "What you want to know.",
      items: [
        { q: "Are the personas real people?",
          a: "No. They are AI-generated characters with clear stances, triggers, and blind spots. They don't replace real market research — they accelerate the phase before it." },
        { q: "How is Syn different from a regular LLM chat?",
          a: "An LLM chat is a universal assistant. Syn is a moderated discourse space: five distinct personas with clearly defined stances, structured rounds, a final report — all focused on one concrete concept." },
        { q: "Who owns my data?",
          a: "You. Briefings, sessions, and reports belong to your account. We don't train models on your content." },
        { q: "Can I build my own personas?",
          a: "From the Pro plan onwards. You provide role, stance, language style, and taboos — Syn builds the persona and validates its consistency." },
        { q: "What happens after the session?",
          a: "You get a final report as PDF. Every persona stays available — if you found one particularly insightful, you can keep talking to them 1:1." }
      ]
    },
    finalCta: { title: "Try it on your next concept.", cta: "Get started" },
    footer: {
      tagline: "Synthetic focus groups for concepts that haven't shipped yet.",
      builtBy: "A product of Worqshop",
      cols: [
        { title: "Product", links: [{ label: "How it works", href: "#how" }, { label: "Pricing", href: "#pricing" }, { label: "FAQ", href: "#faq" }] },
        { title: "Legal",   links: [{ label: "Imprint", href: "/impressum" }, { label: "Privacy", href: "/datenschutz" }, { label: "Terms", href: "/agb" }] },
        { title: "Contact", links: [{ label: "hello@asksyn.com", href: "mailto:hello@asksyn.com" }, { label: "Status", href: "#" }] }
      ]
    }
  }
};

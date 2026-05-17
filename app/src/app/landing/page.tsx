import Link from "next/link";
import { getLocaleFromCookies, t, type Locale } from "@/lib/i18n";
import LanguageSwitch from "@/components/LanguageSwitch";

export const dynamic = "force-dynamic";

// Stub-Landing-Page als Reservierter Pfad — wird spaeter zur Domain-Root
// von asksin.com (oder welcher Domain auch immer am Ende registriert wird).
// Auf der Dev-Instanz syn.worqshop.io ist sie unter /landing erreichbar.
export default async function LandingPage() {
  const locale = await getLocaleFromCookies();
  const copy = LANDING_COPY[locale];

  return (
    <main className="min-h-screen">
      {/* Top-Bar */}
      <header className="glass border-b border-stone-200 px-6 py-2.5 flex items-center justify-between sticky top-0 z-20">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img src="/api/assets/syn-avatar" alt="" className="w-7 h-7 rounded-full ring-1 ring-white/10" />
          <div className="font-semibold tracking-tight text-rose-700 group-hover:text-rose-800 text-lg">Syn</div>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <LanguageSwitch locale={locale} />
          <Link href="/login" className="text-stone-700 hover:text-rose-700 font-medium transition-colors">
            {copy.login}
          </Link>
          <Link href="/login"
            className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold shadow-md">
            {copy.startCta}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <span className="inline-block text-[11px] uppercase tracking-[0.2em] font-bold mb-4"
              style={{ color: "#9F1239" }}>
          {copy.heroTag}
        </span>
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-stone-900 mb-5 leading-[1.1]">
          {copy.heroTitle}
        </h1>
        <p className="text-lg md:text-xl text-stone-700 max-w-2xl mx-auto mb-10 leading-relaxed">
          {copy.heroSub}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/login"
            className="btn-primary px-6 py-3 rounded-xl text-base font-semibold shadow-lg">
            {copy.primaryCta}
          </Link>
          <a href="#how"
            className="rounded-xl border border-stone-400 bg-[#F3EFE2] hover:bg-white px-6 py-3 text-base font-semibold text-stone-800 transition-colors">
            {copy.secondaryCta}
          </a>
        </div>
      </section>

      {/* Persona-Preview-Strip — zeigt die 5 Slot-Farben mit Avatar-Gradient als visuelles Statement */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="flex justify-center gap-3 md:gap-5">
          {PERSONA_ACCENTS.map((acc, i) => (
            <div key={i}
              className="w-14 h-14 md:w-20 md:h-20 rounded-full ring-2 ring-white/40 shadow-md"
              style={{ background: `linear-gradient(180deg, ${acc.top}, ${acc.bottom})` }}
              title={acc.family} />
          ))}
        </div>
        <p className="text-center text-sm text-stone-600 mt-4">{copy.personasCaption}</p>
      </section>

      {/* How it works */}
      <section id="how" className="bg-[#F3EFE2] border-y border-stone-300">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-stone-900 mb-2 text-center">
            {copy.howTitle}
          </h2>
          <p className="text-stone-600 text-center mb-10">{copy.howSub}</p>
          <div className="grid md:grid-cols-4 gap-4">
            {copy.steps.map((s, i) => (
              <div key={i} className="rounded-2xl bg-white border border-stone-300 p-5 shadow-sm">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold mb-3"
                  style={{ background: "linear-gradient(180deg, #4C1D95, #BE123C)" }}>
                  {i + 1}
                </div>
                <h3 className="font-semibold text-stone-900 mb-1">{s.title}</h3>
                <p className="text-sm text-stone-700 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value-Props */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-stone-900 mb-10 text-center">
          {copy.valueTitle}
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {copy.values.map((v, i) => (
            <div key={i} className="relative rounded-2xl bg-[#F3EFE2] border border-stone-300 p-5 shadow-sm overflow-hidden pl-6">
              <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1"
                style={{ background: `linear-gradient(180deg, ${PERSONA_ACCENTS[i % 5].top}, ${PERSONA_ACCENTS[i % 5].bottom})` }} />
              <h3 className="font-semibold text-stone-900 mb-1">{v.title}</h3>
              <p className="text-sm text-stone-700 leading-relaxed">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#F3EFE2] border-t border-stone-300">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-stone-900 mb-3">
            {copy.ctaTitle}
          </h2>
          <p className="text-stone-700 mb-7">{copy.ctaSub}</p>
          <Link href="/login"
            className="btn-primary inline-block px-8 py-3.5 rounded-xl text-base font-semibold shadow-lg">
            {copy.primaryCta}
          </Link>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-8 text-xs text-stone-500 flex items-center justify-between flex-wrap gap-2">
        <span>© {new Date().getFullYear()} Worqshop · {copy.builtBy}</span>
        <span className="text-stone-400">{copy.devBadge}</span>
      </footer>
    </main>
  );
}

const PERSONA_ACCENTS = [
  { top: "#E55260", bottom: "#B82338", family: "Crimson" },
  { top: "#3A7E58", bottom: "#144A2C", family: "Deep Emerald" },
  { top: "#F26A38", bottom: "#C53E0F", family: "Orange Glow" },
  { top: "#DBA947", bottom: "#A77E22", family: "Mustard" },
  { top: "#913B4F", bottom: "#4F1A28", family: "Bordeaux" }
];

type LandingCopy = {
  login: string;
  startCta: string;
  heroTag: string;
  heroTitle: string;
  heroSub: string;
  primaryCta: string;
  secondaryCta: string;
  personasCaption: string;
  howTitle: string;
  howSub: string;
  steps: Array<{ title: string; body: string }>;
  valueTitle: string;
  values: Array<{ title: string; body: string }>;
  ctaTitle: string;
  ctaSub: string;
  builtBy: string;
  devBadge: string;
};

const LANDING_COPY: Record<Locale, LandingCopy> = {
  de: {
    login: "Login",
    startCta: "Starten",
    heroTag: "SYNTHETISCHE FOKUSGRUPPEN",
    heroTitle: "Frag fünf, in zehn Minuten.",
    heroSub: "Syn baut dir ein synthetisches Panel aus fünf scharfen Personen, diskutiert dein Thema in drei Runden und liefert einen lesbaren Abschlussbericht. Statt echter Fokusgruppe, in einem Hundertstel der Zeit.",
    primaryCta: "Kostenlos testen",
    secondaryCta: "Wie das funktioniert",
    personasCaption: "Fünf Personas. Echte Disagreements. Keine Ja-Sager.",
    howTitle: "So funktioniert es",
    howSub: "Vier Schritte vom Briefing bis zum Bericht.",
    steps: [
      { title: "Briefing", body: "Beschreib dein Thema. Lad Screenshots, PDFs oder Notizen dazu." },
      { title: "Panel", body: "Syn schlägt dir fünf Personas vor — bewusst kontrovers besetzt." },
      { title: "Drei Runden", body: "Bauchgefühl, konstruktive Vorschläge, priorisierte Handlungen." },
      { title: "Abschluss", body: "Strukturierter Bericht als Text und PDF. 1:1-Folgegespräche auf Wunsch." }
    ],
    valueTitle: "Warum Syn",
    values: [
      { title: "100× schneller", body: "Was klassische Fokusgruppen in Wochen liefern, kriegst du in Minuten — ohne Rekrutierung, ohne Logistik." },
      { title: "Wirklich konfliktfähig", body: "Personas haben individuelle Haltungen und widersprechen sich. Du bekommst echte Spannungslinien statt höfliches Nicken." },
      { title: "Vision-fähig", body: "Lade Screenshots, Mockups oder Briefings hoch — die Personas analysieren visuell und semantisch." },
      { title: "Strukturiert verwertbar", body: "Jede Runde liefert eine Synthese. Am Ende ein Abschlussbericht mit klaren Empfehlungen." },
      { title: "Auf deine Sprache", body: "Komplett zweisprachig: Deutsch und Englisch, der Agent folgt deiner Eingabe." },
      { title: "Privat & on-prem", body: "Eigene Infrastruktur. Deine Daten gehen nicht ins Modell-Training. Kein Sharing." }
    ],
    ctaTitle: "Bereit für die erste Fokusgruppe?",
    ctaSub: "Ein Account, fünf Personas, drei Runden. Wir freuen uns auf dein Briefing.",
    builtBy: "Built by Worqshop",
    devBadge: "Developer-Instanz"
  },
  en: {
    login: "Log in",
    startCta: "Get started",
    heroTag: "SYNTHETIC FOCUS GROUPS",
    heroTitle: "Ask five, in ten minutes.",
    heroSub: "Syn builds a synthetic panel of five sharp personas, debates your topic across three rounds, and delivers a clear final report. Like a real focus group, at a fraction of the time.",
    primaryCta: "Try it free",
    secondaryCta: "How it works",
    personasCaption: "Five personas. Real disagreements. No yes-sayers.",
    howTitle: "How it works",
    howSub: "Four steps from briefing to report.",
    steps: [
      { title: "Briefing", body: "Describe your topic. Drop in screenshots, PDFs, or notes." },
      { title: "Panel", body: "Syn proposes five personas — deliberately set up for controversy." },
      { title: "Three rounds", body: "Gut feeling, constructive suggestions, prioritised actions." },
      { title: "Wrap-up", body: "Structured report as text and PDF. 1:1 follow-up chats if you want." }
    ],
    valueTitle: "Why Syn",
    values: [
      { title: "100× faster", body: "What traditional focus groups deliver in weeks, you get in minutes — no recruiting, no logistics." },
      { title: "Genuinely confrontational", body: "Personas have individual stances and contradict each other. Real tension lines instead of polite nodding." },
      { title: "Vision-ready", body: "Upload screenshots, mockups, or briefings — personas analyse them visually and semantically." },
      { title: "Structured outputs", body: "Each round produces a synthesis. The final report bundles clear recommendations." },
      { title: "In your language", body: "Fully bilingual: German and English, the agent follows your input." },
      { title: "Private & on-prem", body: "Own infrastructure. Your data never trains models. No sharing." }
    ],
    ctaTitle: "Ready for your first focus group?",
    ctaSub: "One account, five personas, three rounds. We're looking forward to your briefing.",
    builtBy: "Built by Worqshop",
    devBadge: "Developer instance"
  }
};

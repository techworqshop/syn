import { requireUser } from "@/lib/current-user";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const u = await requireUser().catch(() => null);
  if (!u) redirect("/login");
  return (
    <div className="max-w-3xl mx-auto w-full p-6">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">So funktioniert Syn</h1>
          <p className="text-sm text-stone-600 mt-1">
            Synthetische Fokusgruppen in vier Schritten.
          </p>
        </div>
        <Link href="/app/dashboard" className="text-sm text-stone-600 hover:text-stone-900 font-medium">← Dashboard</Link>
      </div>

      <div className="space-y-4">
        <Section number="1" title="Briefing schreiben">
          <p>
            Klick auf <strong>Neue Fokusgruppe</strong> im Dashboard und beschreib Syn dein Thema. Je konkreter, desto besser:
            Wer ist die Zielgruppe? Was soll bewertet werden? Welche Entscheidung steht an?
          </p>
          <p className="mt-2">
            Optional Dateien dazu: Screenshots, PDFs, Notizen. Drag &amp; Drop in den Chat oder über das
            Büroklammer-Icon. Drei Kategorien:
          </p>
          <ul className="mt-2 ml-5 list-disc space-y-1">
            <li><Pill tone="briefing">Briefing</Pill> — Kontext, den nur Syn sieht (Strategiepapier, Hintergrund)</li>
            <li><Pill tone="persona">Persona-Daten</Pill> — Beschreibungen oder Profile bestimmter Zielgruppen</li>
            <li><Pill tone="panel">Panel-Review</Pill> — das, was die Personas bewerten sollen (Screenshot, Mockup, Text)</li>
          </ul>
        </Section>

        <Section number="2" title="Panel zusammenstellen">
          <p>
            Syn schlägt dir ein 5er-Panel mit Spannungsfeldern vor — bewusst gemischt, damit echte Diskussion entsteht.
            Du kannst tauschen („gib mir eine Power-Userin statt Mira"), Personen anders gewichten oder einfach mit „passt" weitermachen.
          </p>
          <p className="mt-2 text-sm">
            <strong>Haltungs-Slider</strong> in der Sidebar (links): 0 = offen für Argumente, 10 = standhaft.
            Standard 5 ist meistens richtig. Höher heißt: die Persona ändert ihre Position nur bei sehr starken
            Gegenargumenten.
          </p>
        </Section>

        <Section number="3" title="Drei Runden">
          <p>Wenn das Panel steht, läuft die Diskussion in drei festen Runden:</p>
          <ul className="mt-2 ml-5 list-decimal space-y-1.5">
            <li><strong>Bauchgefühl</strong> — erste, ehrliche Reaktion auf das Briefing</li>
            <li><strong>Konstruktive Vorschläge</strong> — was die Personas konkret verbessern würden</li>
            <li><strong>Priorisierte Handlungsliste</strong> — was am wichtigsten ist, mit Begründung</li>
          </ul>
          <p className="mt-3 text-sm">
            Pro Runde antworten alle Personas parallel, Syn synthetisiert das Ergebnis und du entscheidest, ob die nächste Runde startet.
            Dauer pro Runde: meistens 2–4 Minuten — hol dir gern einen Kaffee.
          </p>
        </Section>

        <Section number="4" title="Abschluss">
          <p>
            Nach Runde 3 ist der Hauptchat geschlossen. Du hast zwei Wege weiter:
          </p>
          <ul className="mt-2 ml-5 list-disc space-y-1.5">
            <li>
              <strong>Abschlussbericht generieren</strong> — über das 3-Punkte-Menü rechts oben.
              Kommt als lesbare Text-Bubble in den Chat <em>und</em> als PDF zum Download (ca. 5–7 Seiten).
            </li>
            <li>
              <strong>Einzelne Personas weiter befragen</strong> — Klick auf eine Persona in der Sidebar
              öffnet einen 1:1-Interview-Chat. Nützlich für gezielte Detailfragen, ohne die Hauptdiskussion zu verwässern.
            </li>
          </ul>
        </Section>

        <Section number="" title="Tipps">
          <ul className="ml-5 list-disc space-y-1.5">
            <li>Briefings funktionieren am besten <strong>konkret und mit echten Daten</strong> — Preise, Zielgruppen-Specs, vorhandene Annahmen.</li>
            <li>Wenn du Screenshots reinziehst, lass Syn vor Runde 1 antworten — die Bilder werden dann automatisch von Gemini vorab analysiert und stehen den Personas im Detail zur Verfügung.</li>
            <li>Lass die Diskussion <strong>ihre Spannungen behalten</strong>. Wenn Personas sich widersprechen, ist das gut — die Synthese macht daraus eine klare Handlungsempfehlung.</li>
            <li>Möchte jemand mitlesen ohne Account? Über <strong>Teilen</strong> im 3-Punkte-Menü kriegst du einen Read-only-Link. Der Empfänger sieht den ganzen Verlauf, kann Dateien runterladen und den Chat als Markdown exportieren.</li>
            <li>Eine Fokusgruppe ist <strong>nicht duplizierbar</strong>. Wenn du dasselbe Thema mit anderem Panel testen willst: neue Fokusgruppe starten.</li>
          </ul>
        </Section>

        <Section number="" title="FAQ">
          <Faq q="Wie lange darf das Briefing sein?">
            So lang du willst. Syn liest auch mehrseitige Strategiepapiere. Für ein gutes Panel reichen aber meistens 5–10 Sätze plus 1–3 Screenshots.
          </Faq>
          <Faq q="Was, wenn eine Persona einfach nicht antwortet?">
            Wir starten sie nach 1–2 Minuten automatisch nochmal. Du musst nichts machen. Sollte sie nach drei Versuchen immer noch nicht antworten, schaut Syn drüber und schließt die Runde trotzdem.
          </Faq>
          <Faq q="Kann ich eine bestimmte echte Person als Persona nachbauen?">
            Ja. Beschreibe sie im Briefing („Eleanor, 38, Marketing-Direktorin, war fünf Jahre bei IKEA"). Je präziser, desto näher kommt Syn dran. Profile, LinkedIn-Texte oder Notizen kannst du als <em>Persona-Daten</em> Datei hochladen.
          </Faq>
          <Faq q="Werden meine Daten zum Training verwendet?">
            Nein. Syn läuft auf eigener Infrastruktur, die LLMs (Anthropic Claude, Google Gemini) bekommen nur den Inhalt deiner Session zur Inferenz — kein Training, kein Sharing.
          </Faq>
          <Faq q="Kann ich nach Runde 3 noch was ändern?">
            Hauptchat ist gesperrt — bewusst, damit du nicht endlos Synthesen produzierst. Über das 1:1-Interview kannst du jede Persona aber noch beliebig weiter befragen.
          </Faq>
          <Faq q="Was kostet eine Session?">
            Im Schnitt 1–3 € an LLM-Kosten (Opus/Sonnet/Gemini). Die Infrastruktur läuft auf unserem Server.
          </Faq>
        </Section>

        <div className="mt-8 rounded-2xl bg-amber-100 border border-amber-700/40 p-4 text-sm">
          <strong className="text-amber-900">Noch Fragen?</strong> Schreib Lukasz oder Tech-Worqshop.
        </div>
      </div>
    </div>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-stone-50 border border-stone-300 p-5 shadow-sm">
      <div className="flex items-baseline gap-3 mb-2">
        {number && (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-emerald-700 to-lime-700 text-white text-sm font-bold shrink-0">{number}</span>
        )}
        <h2 className="text-lg font-semibold tracking-tight text-stone-900">{title}</h2>
      </div>
      <div className="text-stone-800 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Pill({ tone, children }: { tone: "briefing" | "persona" | "panel"; children: React.ReactNode }) {
  const cls =
    tone === "briefing" ? "bg-yellow-200 text-yellow-950 border-yellow-700" :
    tone === "persona"  ? "bg-lime-200 text-lime-950 border-lime-700" :
                          "bg-orange-200 text-orange-950 border-orange-700";
  return <span className={`inline-block px-2 py-0.5 rounded-full border font-bold text-[11px] uppercase tracking-wide ${cls}`}>{children}</span>;
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-stone-300 bg-white px-4 py-2.5 mb-2 transition-colors hover:border-amber-700/50">
      <summary className="cursor-pointer font-semibold text-stone-900 list-none flex items-center justify-between">
        <span>{q}</span>
        <span className="text-stone-500 group-open:rotate-180 transition-transform">▾</span>
      </summary>
      <div className="mt-2 text-stone-700 text-sm leading-relaxed">{children}</div>
    </details>
  );
}

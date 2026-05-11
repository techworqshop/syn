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
            <li>Wenn du Screenshots oder PDFs reinziehst, lass Syn nach dem Upload kurz Zeit. Die Inhalte werden vor der ersten Runde ausgewertet und stehen dann allen Personas zur Verfügung.</li>
            <li>Lass die Diskussion <strong>ihre Spannungen behalten</strong>. Wenn Personas sich widersprechen, ist das gut — die Synthese macht daraus eine klare Handlungsempfehlung.</li>
            <li>Möchte jemand mitlesen ohne Account? Über <strong>Teilen</strong> im 3-Punkte-Menü kriegst du einen Read-only-Link. Der Empfänger sieht den ganzen Verlauf, kann Dateien runterladen und den Chat als Markdown exportieren.</li>
          </ul>
        </Section>

        <Section number="" title="FAQ">
          <Faq q="Wo finde ich den Abschlussbericht?">
            Klick auf das <strong>3-Punkte-Menü</strong> rechts oben in der Session und wähl <strong>Abschlussbericht (PDF)</strong>. Nach ein paar Minuten erscheint der Bericht direkt als Text-Bubble im Chat — plus ein PDF-Download-Button.
          </Faq>
          <Faq q="Wie befrage ich eine einzelne Persona genauer?">
            Klick eine Persona in der Sidebar an. Es öffnet sich ein 1:1-Chat-Fenster, in dem du gezielt nachfragen kannst. Funktioniert auch nach Abschluss der Hauptdiskussion.
          </Faq>
          <Faq q="Wie teile ich die Fokusgruppe mit jemandem?">
            3-Punkte-Menü → <strong>Teilen</strong>. Du kriegst einen Link kopiert, den du weitergeben kannst. Der Empfänger sieht alles read-only, kann Dateien runterladen und den ganzen Chat als Markdown exportieren — ideal zum Reinpasten in ChatGPT oder Claude.
          </Faq>
          <Faq q="Wo stelle ich die Haltung einer Persona ein?">
            Unter jeder Persona-Kachel in der Sidebar ist ein <strong>Haltungs-Slider</strong>. Links („offen") = sie ändert ihre Meinung bei guten Argumenten, rechts („standhaft") = sie bleibt bei ihrer Position. Standardwert 5 passt meistens.
          </Faq>
          <Faq q="Wie lange darf das Briefing sein?">
            So lang du willst. Syn liest auch mehrseitige Strategiepapiere. Für ein gutes Panel reichen aber meistens 5–10 Sätze plus 1–3 Screenshots.
          </Faq>
          <Faq q="Kann ich eine echte Person als Persona nachbauen?">
            Ja. Beschreibe sie im Briefing („Eleanor, 38, Marketing-Direktorin, fünf Jahre Erfahrung im FMCG-Bereich"). Je präziser, desto näher kommt Syn dran. Profile, LinkedIn-Texte oder Notizen kannst du als <em>Persona-Daten</em> Datei hochladen.
          </Faq>
          <Faq q="Kann ich nach Runde 3 noch was ändern?">
            Der Hauptchat ist nach Runde 3 abgeschlossen — die Diskussion hat ihren Bogen dann gespannt. Über das <strong>1:1-Interview</strong> in der Sidebar kannst du jede Persona aber noch beliebig weiter befragen.
          </Faq>
          <Faq q="Kann ich die Sidebar einklappen?">
            Ja. Klick auf den kleinen Pfeil rechts oben am „Personas"-Header. Die Sidebar schrumpft zu einer schmalen Leiste mit den Avataren — Klick auf einen Avatar startet weiterhin den 1:1-Chat. Pfeil oben links bringt sie zurück.
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
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-purple-900 to-rose-700 text-white text-sm font-bold shrink-0">{number}</span>
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
    tone === "persona"  ? "bg-emerald-900/15 text-emerald-950 border-emerald-900/60" :
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

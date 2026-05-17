import Link from "next/link";
import BillingShell from "@/components/billing/BillingShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Syn — Abrechnung" };

// Billing-Dashboard. Alle Werte aktuell hardcoded — sobald Stripe-Customer
// und Subscription verknuepft sind, kommen Plan/Nutzung/Rechnungen via
// Stripe-API.
export default function BillingPage() {
  return (
    <BillingShell centered={false}>
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight" style={{ color: "#1F2420" }}>Abrechnung</h1>
        <p className="text-sm mt-1.5" style={{ color: "#7A7268" }}>Plan, Rechnungen und Zahlungsmethode auf einen Blick.</p>
      </div>

      {/* Section: Aktueller Plan */}
      <Section title="Aktueller Plan" rightLink={{ href: "/#pricing", label: "Plan wechseln →" }}>
        <p className="text-2xl font-semibold tracking-tight mb-1.5" style={{ color: "#1F2420" }}>Pro</p>
        <p className="text-sm mb-5" style={{ color: "#4A4640" }}>
          <strong className="font-medium" style={{ color: "#1F2420" }}>199 €</strong> pro Monat · Nächste Abrechnung am 17. Juni 2026
        </p>
        <div className="rounded-full overflow-hidden h-2 mb-1.5" style={{ background: "#E8E2D2" }}>
          <div className="h-full rounded-full" style={{ width: "60%", background: "linear-gradient(90deg, #4C1D95, #BE123C)" }} />
        </div>
        <p className="text-xs" style={{ color: "#7A7268" }}>6 von 10 Audiences in diesem Monat genutzt</p>
        <div className="flex gap-2 mt-5 flex-wrap">
          <Link href="/#pricing" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] text-[13px] font-medium"
            style={{ background: "#1F2420", color: "#F3EFE2" }}>
            Plan wechseln
          </Link>
          <Link href="/billing/cancel" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[9px] text-[13px] font-medium"
            style={{ background: "transparent", color: "#913B4F", border: "1px solid #913B4F" }}>
            Abo kündigen
          </Link>
        </div>
      </Section>

      {/* Section: Zahlungsmethode */}
      <Section title="Zahlungsmethode" rightLink={{ href: "#", label: "Bearbeiten →" }}>
        <div className="flex items-center gap-3.5">
          <div className="w-[42px] h-[30px] rounded-md flex items-center justify-center text-white"
            style={{ background: "#1F2420" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <div>
            <strong className="block text-sm font-medium mb-0.5" style={{ color: "#1F2420" }}>Visa endet auf •••• 4242</strong>
            <span className="text-[12.5px]" style={{ color: "#7A7268" }}>Gültig bis 04/2028</span>
          </div>
        </div>
      </Section>

      {/* Section: Rechnungen */}
      <Section title="Rechnungen" rightLink={{ href: "#", label: "Alle ansehen →" }}>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>Datum</Th>
              <Th>Beschreibung</Th>
              <Th align="right">Betrag</Th>
              <Th align="right">PDF</Th>
            </tr>
          </thead>
          <tbody>
            {[
              { date: "17. Mai 2026", desc: "Pro · Monat", amount: "236,81 €" },
              { date: "17. Apr 2026", desc: "Pro · Monat", amount: "236,81 €" },
              { date: "17. Mär 2026", desc: "Pro · Monat", amount: "236,81 €" }
            ].map((inv, i, arr) => (
              <tr key={inv.date}>
                <Td last={i === arr.length - 1}><strong className="font-medium" style={{ color: "#1F2420" }}>{inv.date}</strong></Td>
                <Td last={i === arr.length - 1}>{inv.desc}</Td>
                <Td last={i === arr.length - 1} align="right">{inv.amount}</Td>
                <Td last={i === arr.length - 1} align="right">
                  <a href="#" className="inline-flex items-center gap-1 text-[13px] font-medium hover:underline" style={{ color: "#BE123C" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    PDF
                  </a>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </BillingShell>
  );
}

function Section({ title, rightLink, children }: { title: string; rightLink?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden mb-5 rounded-[18px]"
      style={{ background: "#F3EFE2", border: "1px solid rgba(31,36,32,0.06)" }}>
      <span aria-hidden className="absolute top-0 left-0 right-0"
        style={{ height: "4px", background: "linear-gradient(90deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)" }} />
      <div className="px-7 pt-7 pb-6">
        <div className="flex justify-between items-start mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#7A7268", letterSpacing: "0.08em" }}>{title}</h2>
          {rightLink && (
            <a href={rightLink.href} className="text-[13px] font-medium hover:underline" style={{ color: "#BE123C" }}>
              {rightLink.label}
            </a>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className="text-[11px] font-semibold uppercase pb-3 pt-0 px-0 tracking-wider"
      style={{ color: "#7A7268", letterSpacing: "0.06em", textAlign: align, borderBottom: "1px solid rgba(31,36,32,0.10)" }}>
      {children}
    </th>
  );
}
function Td({ children, align = "left", last = false }: { children: React.ReactNode; align?: "left" | "right"; last?: boolean }) {
  return (
    <td className="py-3.5 text-sm"
      style={{ color: "#4A4640", textAlign: align, borderBottom: last ? "none" : "1px solid rgba(31,36,32,0.06)" }}>
      {children}
    </td>
  );
}

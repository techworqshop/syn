import Link from "next/link";
import BillingShell from "@/components/billing/BillingShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Syn — Abo gekündigt" };

// Success-State nach erfolgreicher Kuendigung. Sobald Stripe verdrahtet
// ist, kommt das Cancellation-At-Datum aus der Subscription.
export default function CancelledPage() {
  return (
    <BillingShell>
      <div className="text-center">
        <h1 className="text-[26px] font-semibold tracking-tight mb-3" style={{ color: "#1F2420" }}>Abo gekündigt.</h1>
        <p className="text-[15px] mb-6 leading-relaxed" style={{ color: "#4A4640" }}>
          Wir hoffen, wir sehen uns wieder. Falls etwas gefehlt hat — sag's gerne, das hilft uns beim Bauen.
        </p>

        <div className="rounded-[12px] px-5 py-4 mb-7 text-left"
          style={{ background: "#fdfbf4", border: "1px solid rgba(31,36,32,0.10)" }}>
          <p className="text-[13.5px] leading-relaxed m-0" style={{ color: "#4A4640" }}>
            Dein <strong className="font-medium" style={{ color: "#1F2420" }}>Pro-Plan</strong> läuft noch bis zum{" "}
            <strong className="font-medium" style={{ color: "#1F2420" }}>17. Juni 2026</strong>. Bis dahin kannst du Syn ganz normal nutzen. Danach wird dein Account auf Read-Only umgestellt — deine Berichte bleiben erhalten.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Link href="/app/dashboard" className="inline-block px-7 py-3 rounded-[11px] text-sm font-medium text-white"
            style={{ background: "linear-gradient(180deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)" }}>
            Zum Dashboard
          </Link>
          <Link href="/billing" className="text-[13px] mt-1 hover:underline" style={{ color: "#4A4640" }}>
            Doch nicht? Reaktivieren
          </Link>
        </div>
      </div>
    </BillingShell>
  );
}

import Link from "next/link";
import BillingShell from "@/components/billing/BillingShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Syn — Kündigung bestätigen" };

// Bordeaux-Stripe (statt Brand) signalisiert Kuendigung. "Trotzdem kuendigen"
// wird spaeter ein Server-Action der Stripe.subscriptions.cancel() ausloest;
// derzeit nur Link zum Cancelled-State.
export default function CancelConfirmPage() {
  return (
    <BillingShell stripeVariant="danger" cardMaxWidth="520px">
      <h1 className="text-[26px] font-semibold tracking-tight mb-2.5" style={{ color: "#1F2420" }}>Abo wirklich kündigen?</h1>
      <p className="text-[15px] mb-6 leading-relaxed" style={{ color: "#4A4640" }}>
        Schade. Bevor du gehst — das passiert nach der Kündigung:
      </p>

      <div className="rounded-md px-6 py-5 mb-7"
        style={{ background: "#fdfbf4", border: "1px solid rgba(31,36,32,0.10)" }}>
        <h3 className="text-[13px] font-semibold uppercase mb-3" style={{ color: "#7A7268", letterSpacing: "0.05em" }}>Was passiert</h3>
        <ul className="space-y-2 m-0 p-0 list-none">
          {[
            <>Dein <strong className="font-medium" style={{ color: "#1F2420" }}>Pro-Plan</strong> läuft bis <strong className="font-medium" style={{ color: "#1F2420" }}>17. Juni 2026</strong> weiter.</>,
            "Bis dahin kannst du Syn voll nutzen.",
            "Danach wird dein Account auf Read-Only gesetzt — keine neuen Audiences mehr.",
            "Deine bestehenden Berichte und Sessions bleiben erhalten und können weiterhin eingesehen werden.",
            "Du kannst jederzeit reaktivieren und genau dort weitermachen."
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[14px] leading-relaxed" style={{ color: "#4A4640" }}>
              <span aria-hidden style={{ color: "#7A7268", fontWeight: 600 }}>·</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2.5">
        <Link href="/billing" className="block text-center text-white border-none rounded-md py-3 px-5 text-sm font-medium"
          style={{ background: "linear-gradient(180deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)" }}>
          Doch behalten
        </Link>
        <Link href="/billing/cancelled" className="block text-center rounded-md py-3 px-5 text-sm font-medium transition-colors hover:bg-[#913B4F] hover:text-[#F3EFE2]"
          style={{ background: "transparent", color: "#913B4F", border: "1px solid #913B4F" }}>
          Trotzdem kündigen
        </Link>
      </div>
    </BillingShell>
  );
}

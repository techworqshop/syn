import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Syn — Zahlung fehlgeschlagen" };

// Stripe-Cancel-Url Ziel. Aktuell Placeholder mit hartkodiertem Pro-Plan;
// spaeter holen wir den Plan + Reason aus den SearchParams / Stripe-Webhook.
export default function PaymentFailedPage() {
  return (
    <main
      className="min-h-screen flex flex-col"
      style={{
        background: "#F4F1EA",
        color: "#1F2420",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
      }}
    >
      <nav
        className="flex items-center justify-between px-7 py-3.5"
        style={{ background: "rgba(243,239,226,0.55)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.5)" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/api/assets/syn-avatar" alt="Syn" className="w-7 h-7 rounded-full ring-1 ring-white/40 object-cover" />
          <span className="font-semibold text-lg tracking-tight" style={{ color: "#BE123C" }}>Syn</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[480px] relative overflow-hidden text-center"
          style={{ background: "#F3EFE2", border: "1px solid rgba(31,36,32,0.06)", borderRadius: "6px" }}>
          <span aria-hidden className="absolute top-0 left-0 right-0"
            style={{ height: "4px", background: "linear-gradient(90deg, #913B4F, #4F1A28)" }} />
          <div className="px-10 pt-12 pb-10">
            <h1 className="text-[26px] font-semibold tracking-tight mb-2.5" style={{ color: "#1F2420" }}>Zahlung fehlgeschlagen.</h1>
            <p className="text-[15px] mb-6 leading-relaxed" style={{ color: "#4A4640" }}>
              Deine Zahlung konnte nicht abgewickelt werden. Häufige Ursachen: abgelaufene Karte, unzureichendes Guthaben oder eine Sicherheitsprüfung der Bank.
            </p>
            <div className="rounded-md px-4 py-3.5 mb-7 text-left"
              style={{ background: "#fdfbf4", border: "1px solid rgba(31,36,32,0.10)", borderLeft: "3px solid #913B4F" }}>
              <p className="m-0 text-[13.5px] leading-relaxed" style={{ color: "#4A4640" }}>
                <strong className="font-medium" style={{ color: "#1F2420" }}>Pro-Plan</strong> · 199 € / Monat
              </p>
              <p className="m-0 mt-1 text-[13.5px]" style={{ color: "#4A4640" }}>Es wurde nichts abgebucht.</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Link
                href="/checkout"
                className="inline-block px-7 py-3 rounded-md text-sm font-medium text-white"
                style={{ background: "linear-gradient(180deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)" }}
              >
                Erneut versuchen
              </Link>
              <Link href="/#pricing" className="text-[13px] mt-1 hover:underline" style={{ color: "#4A4640" }}>
                Anderen Plan wählen
              </Link>
            </div>
          </div>
        </div>
      </div>

      <footer className="px-8 py-6 flex justify-center gap-6 text-xs" style={{ color: "#7A7268" }}>
        <Link href="/impressum" className="hover:text-stone-900 transition-colors">Impressum</Link>
        <Link href="/datenschutz" className="hover:text-stone-900 transition-colors">Datenschutz</Link>
        <Link href="/agb" className="hover:text-stone-900 transition-colors">AGB</Link>
      </footer>
    </main>
  );
}

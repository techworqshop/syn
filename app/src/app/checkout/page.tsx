import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Syn — Bestellung bestätigen" };

// Pre-Checkout-Confirmation. Aktuell Placeholder mit hartkodiertem
// Pro-Plan; sobald Chargebee verdrahtet ist, kommt der Plan-Slug ueber
// SearchParams (?plan=pro) und die Totals dynamisch aus dem Chargebee-Preis.
export default function CheckoutPage() {
  return (
    <main
      className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse 900px 700px at 12% 8%, rgba(101,134,70,0.10), transparent 60%)," +
          "radial-gradient(ellipse 1000px 800px at 88% 32%, rgba(214,165,88,0.09), transparent 60%)," +
          "radial-gradient(ellipse 800px 600px at 50% 95%, rgba(143,122,80,0.10), transparent 60%)," +
          "#E8E2D2",
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
        <Link href="/#pricing" className="text-sm hover:underline" style={{ color: "#4A4640" }}>Abbrechen</Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[520px] relative overflow-hidden"
          style={{ background: "#F3EFE2", border: "1px solid rgba(31,36,32,0.06)", borderRadius: "20px" }}>
          <span aria-hidden className="absolute top-0 left-0 right-0"
            style={{ height: "4px", background: "linear-gradient(90deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)" }} />
          <div className="px-8 pt-10 pb-8">
            <h1 className="text-2xl font-semibold tracking-tight mb-1.5" style={{ color: "#1F2420" }}>Bestellung bestätigen</h1>
            <p className="text-sm mb-7" style={{ color: "#7A7268" }}>Im nächsten Schritt öffnet sich Chargebee für die Zahlung.</p>

            {/* Plan-Karte */}
            <div className="relative overflow-hidden rounded-2xl mb-5 px-6 py-5"
              style={{ background: "#fdfbf4", border: "1px solid rgba(31,36,32,0.10)" }}>
              <span aria-hidden className="absolute top-0 left-0 bottom-0"
                style={{ width: "4px", background: "linear-gradient(180deg, #4C1D95, #9F1239, #BE123C)" }} />
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#7A7268" }}>Plan</p>
                  <p className="text-[22px] font-semibold tracking-tight" style={{ color: "#1F2420" }}>Pro</p>
                </div>
                <div className="text-right">
                  <strong className="block text-[22px] font-semibold tracking-tight" style={{ color: "#1F2420" }}>199 €</strong>
                  <span className="text-xs" style={{ color: "#7A7268" }}>pro Monat</span>
                </div>
              </div>
              <p className="text-[13px] mb-3" style={{ color: "#4A4640" }}>10 Audiences pro Monat</p>
              <ul className="space-y-1.5">
                {[
                  "Standard- und eigene Personas",
                  "Share-Links für Stakeholder",
                  "Rigidity-Steuerung",
                  "Priorisierte Verarbeitung"
                ].map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-[13px]" style={{ color: "#4A4640" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#3A7E58" strokeWidth="2.5" className="w-3.5 h-3.5 mt-1 shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Totals */}
            <div className="pb-5 mb-5" style={{ borderBottom: "1px solid rgba(31,36,32,0.08)" }}>
              <div className="flex justify-between text-sm py-1" style={{ color: "#4A4640" }}>
                <span>Zwischensumme</span><span>199,00 €</span>
              </div>
              <div className="flex justify-between text-sm py-1" style={{ color: "#4A4640" }}>
                <span>USt. (19 %)</span><span>37,81 €</span>
              </div>
              <div className="flex justify-between text-base font-semibold pt-2.5 mt-1.5"
                style={{ color: "#1F2420", borderTop: "1px solid rgba(31,36,32,0.08)" }}>
                <span>Heute zu zahlen</span><span>236,81 €</span>
              </div>
            </div>

            {/* Trust-Note */}
            <div className="rounded-[10px] px-4 py-3.5 mb-5 flex items-start gap-2.5"
              style={{ background: "#fdfbf4", border: "1px solid rgba(31,36,32,0.08)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#7A7268" strokeWidth="2" className="w-4 h-4 mt-0.5 shrink-0">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <p className="text-[12.5px] leading-relaxed m-0" style={{ color: "#4A4640" }}>
                Die Zahlung läuft über Chargebee. Wir speichern keine Kreditkartendaten. Du kannst dein Abo jederzeit in den Einstellungen kündigen.
              </p>
            </div>

            {/* CTA — noch ohne Chargebee-Verdrahtung; Placeholder */}
            <button
              className="w-full text-white border-none rounded-[11px] py-3.5 px-4 text-sm font-medium flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(180deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)" }}
              disabled
              title="Chargebee-Integration folgt"
            >
              <span>Weiter zur Zahlung</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </button>

            {/* Trust-Signals */}
            <div className="flex justify-center gap-5 mt-4 flex-wrap">
              {[
                { svg: <path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zm-3 0V7a4 4 0 1 0-8 0v4" />, label: "SSL-verschlüsselt" },
                { svg: <><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" /></>, label: "Monatlich kündbar" },
                { svg: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>, label: "Rechnung per Mail" }
              ].map((t, i) => (
                <span key={i} className="text-[11.5px] flex items-center gap-1" style={{ color: "#7A7268" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">{t.svg}</svg>
                  {t.label}
                </span>
              ))}
            </div>

            <p className="text-center text-sm mt-5" style={{ color: "#7A7268" }}>
              Anderer Plan?{" "}
              <Link href="/#pricing" className="font-medium hover:underline" style={{ color: "#1F2420" }}>Zurück zur Übersicht</Link>
            </p>
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

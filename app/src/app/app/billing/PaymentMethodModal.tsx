"use client";
import { useRef, useState } from "react";
import { CardComponent, CardNumber, CardExpiry, CardCVV } from "@chargebee/chargebee-js-react-wrapper";
import Script from "next/script";
import type { Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  onClose: () => void;
  onSuccess: () => void;
};

declare global {
  interface Window {
    Chargebee?: {
      init: (opts: { site: string; publishableKey: string }) => unknown;
    };
  }
}

export default function PaymentMethodModal({ locale, onClose, onSuccess }: Props) {
  // Wrapper FieldContainer class isn't exported; use any to bypass strict typing.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cardRef = useRef<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [scriptReady, setScriptReady] = useState(false);
  const site = process.env.NEXT_PUBLIC_CHARGEBEE_SITE ?? "";
  const pk = process.env.NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY ?? "";
  const isTestSite = site.includes("test");

  async function submit() {
    if (!cardRef.current) { setError("Card form not ready"); return; }
    setError(null); setSubmitting(true);
    try {
      const ir = await fetch("/api/billing/payment-intent", { method: "POST" });
      const ij = await ir.json().catch(() => ({})) as { intent?: unknown; error?: string };
      if (!ir.ok || !ij.intent) throw new Error(ij?.error || "intent failed");
      const authorized = await cardRef.current.authorizeWith3ds(ij.intent, {}, {});
      const intentId = (authorized as { id?: string })?.id;
      if (!intentId) throw new Error("3DS authorization failed");
      const r = await fetch("/api/billing/payment-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: intentId, firstName: firstName.trim(), lastName: lastName.trim() })
      });
      if (!r.ok) throw new Error(await r.text() || `HTTP ${r.status}`);
      onSuccess();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      setError(msg);
      setSubmitting(false);
    }
  }

  const fieldStyle = {
    base: {
      color: "#1F2420",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "16px",
      "::placeholder": { color: "#A8A29E" }
    },
    invalid: { color: "#9F1239" }
  };

  return (
    <>
      <Script
        src="https://js.chargebee.com/v2/chargebee.js"
        strategy="afterInteractive"
        onLoad={() => {
          try { window.Chargebee?.init({ site, publishableKey: pk }); } catch (e) { setError(String(e)); }
          setScriptReady(true);
        }}
        onError={() => setError("Failed to load Chargebee.js")}
      />
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-md bg-[#F3EFE2] border border-stone-300 shadow-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-stone-300/70 flex items-center justify-between">
            <div className="text-lg font-semibold" style={{ color: "#1F2420" }}>
              {locale === "en" ? "Update payment method" : "Zahlungsmethode aendern"}
            </div>
            <button onClick={onClose} disabled={submitting} className="text-stone-500 hover:text-stone-900 disabled:opacity-50">×</button>
          </div>
          <div className="px-6 py-5 space-y-3">
            {isTestSite && (
              <div className="rounded-md border border-amber-700/40 bg-amber-50 px-3 py-2 text-xs" style={{ color: "#7A4E13" }}>
                <div className="font-semibold mb-0.5">{locale === "en" ? "Test environment" : "Testumgebung"}</div>
                <div>{locale === "en" ? "Test cards:" : "Test-Karten:"}</div>
                <ul className="mt-1 space-y-0.5 font-mono text-[11px]">
                  <li>4111 1111 1111 1111 — success</li>
                  <li>4000 0000 0000 0341 — declined</li>
                  <li>4100 0000 0000 0019 — 3DS challenge</li>
                </ul>
                <div className="mt-1">{locale === "en" ? "Expiry: 12/30 · CVC: 123" : "Ablauf: 12/30 · CVC: 123"}</div>
              </div>
            )}
            {!scriptReady && (
              <div className="text-sm text-stone-500">{locale === "en" ? "Loading secure card form..." : "Sicheres Card-Formular laedt..."}</div>
            )}
            {error && (
              <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm" style={{ color: "#9F1239" }}>{error}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#7A7268" }}>
                  {locale === "en" ? "First name" : "Vorname"}
                </label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} disabled={submitting}
                  className="w-full h-11 px-3 py-2 bg-white rounded-md border border-stone-300 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#7A7268" }}>
                  {locale === "en" ? "Last name" : "Nachname"}
                </label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} disabled={submitting}
                  className="w-full h-11 px-3 py-2 bg-white rounded-md border border-stone-300 outline-none text-sm" />
              </div>
            </div>
            {scriptReady && (
              <CardComponent ref={cardRef} styles={fieldStyle} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#7A7268" }}>
                    {locale === "en" ? "Card number" : "Kartennummer"}
                  </label>
                  <CardNumber className="h-11 px-3 py-3 bg-white rounded-md border border-stone-300" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#7A7268" }}>{locale === "en" ? "Expiry" : "Ablauf"}</label>
                    <CardExpiry className="h-11 px-3 py-3 bg-white rounded-md border border-stone-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#7A7268" }}>CVC</label>
                    <CardCVV className="h-11 px-3 py-3 bg-white rounded-md border border-stone-300" />
                  </div>
                </div>
              </CardComponent>
            )}
          </div>
          <div className="px-6 pb-3 text-xs" style={{ color: "#7A7268" }}>
            {locale === "en" ? "Card data is securely tokenized by Chargebee." : "Kartendaten werden sicher durch Chargebee tokenisiert."}
          </div>
          <div className="px-6 py-4 flex gap-3 justify-end">
            <button onClick={onClose} disabled={submitting}
              className="px-4 py-2 rounded-md text-sm font-semibold border border-stone-400 bg-white text-stone-900 hover:bg-stone-50 disabled:opacity-60">
              {locale === "en" ? "Cancel" : "Abbrechen"}
            </button>
            <button onClick={submit} disabled={submitting || !scriptReady}
              className={`px-4 py-2 rounded-md text-sm font-semibold text-white ${(submitting || !scriptReady) ? "bg-stone-400 cursor-not-allowed" : "btn-primary"}`}>
              {submitting ? (locale === "en" ? "Saving..." : "Speichere...") : (locale === "en" ? "Save card" : "Karte speichern")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

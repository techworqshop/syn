"use client";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  onClose: () => void;
  onSuccess: () => void;
};

type Info = {
  firstName: string; lastName: string; company: string; email: string;
  vatNumber: string; line1: string; line2: string; city: string;
  zip: string; state: string; country: string;
};

const EMPTY: Info = {
  firstName: "", lastName: "", company: "", email: "",
  vatNumber: "", line1: "", line2: "", city: "",
  zip: "", state: "", country: "DE"
};

const COUNTRIES_EU = ["DE","AT","CH","FR","ES","IT","NL","BE","LU","DK","SE","FI","NO","IE","PT","PL","CZ","HU","SK","SI","HR","RO","BG","GR","EE","LV","LT","MT","CY"];

export default function BillingInfoModal({ locale, onClose, onSuccess }: Props) {
  const [info, setInfo] = useState<Info>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing/customer-info")
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(d => setInfo({ ...EMPTY, ...d }))
      .catch(e => setError(e instanceof Error ? e.message : "load failed"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setError(null); setSaving(true);
    try {
      const r = await fetch("/api/billing/customer-info", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(info)
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({} as { error?: string }));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
      setSaving(false);
    }
  }

  const upd = (k: keyof Info) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setInfo(prev => ({ ...prev, [k]: e.target.value }));

  const inp = "w-full h-10 px-3 py-2 bg-white rounded-md border border-stone-300 outline-none text-sm";
  const lbl = "block text-xs font-semibold uppercase tracking-wider mb-1";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-md bg-[#F3EFE2] border border-stone-300 shadow-2xl">
        <div className="px-6 py-5 border-b border-stone-300/70 flex items-center justify-between sticky top-0 bg-[#F3EFE2] z-10">
          <div className="text-lg font-semibold" style={{ color: "#1F2420" }}>
            {locale === "en" ? "Edit billing details" : "Rechnungsdaten aendern"}
          </div>
          <button onClick={onClose} disabled={saving} className="text-stone-500 hover:text-stone-900 disabled:opacity-50">×</button>
        </div>
        <div className="px-6 py-5 space-y-3">
          {loading && (
            <div className="text-sm text-stone-500">{locale === "en" ? "Loading..." : "Lade..."}</div>
          )}
          {error && (
            <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm" style={{ color: "#9F1239" }}>{error}</div>
          )}
          {!loading && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl} style={{ color: "#7A7268" }}>{locale === "en" ? "First name" : "Vorname"}</label>
                  <input className={inp} value={info.firstName} onChange={upd("firstName")} />
                </div>
                <div>
                  <label className={lbl} style={{ color: "#7A7268" }}>{locale === "en" ? "Last name" : "Nachname"}</label>
                  <input className={inp} value={info.lastName} onChange={upd("lastName")} />
                </div>
              </div>
              <div>
                <label className={lbl} style={{ color: "#7A7268" }}>{locale === "en" ? "Company" : "Firma"}</label>
                <input className={inp} value={info.company} onChange={upd("company")} />
              </div>
              <div>
                <label className={lbl} style={{ color: "#7A7268" }}>{locale === "en" ? "Billing email" : "Rechnungs-Email"}</label>
                <input type="email" className={inp} value={info.email} onChange={upd("email")} />
              </div>
              <div>
                <label className={lbl} style={{ color: "#7A7268" }}>{locale === "en" ? "Address line 1" : "Strasse + Nr."}</label>
                <input className={inp} value={info.line1} onChange={upd("line1")} />
              </div>
              <div>
                <label className={lbl} style={{ color: "#7A7268" }}>{locale === "en" ? "Address line 2 (optional)" : "Adresszusatz (optional)"}</label>
                <input className={inp} value={info.line2} onChange={upd("line2")} />
              </div>
              <div className="grid grid-cols-[1fr_2fr] gap-3">
                <div>
                  <label className={lbl} style={{ color: "#7A7268" }}>{locale === "en" ? "ZIP" : "PLZ"}</label>
                  <input className={inp} value={info.zip} onChange={upd("zip")} />
                </div>
                <div>
                  <label className={lbl} style={{ color: "#7A7268" }}>{locale === "en" ? "City" : "Stadt"}</label>
                  <input className={inp} value={info.city} onChange={upd("city")} />
                </div>
              </div>
              <div>
                <label className={lbl} style={{ color: "#7A7268" }}>{locale === "en" ? "Country" : "Land"}</label>
                <select className={inp} value={info.country} onChange={upd("country")}>
                  {COUNTRIES_EU.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl} style={{ color: "#7A7268" }}>{locale === "en" ? "VAT-ID (optional, B2B)" : "USt-IdNr. (optional, B2B)"}</label>
                <input className={inp} value={info.vatNumber} onChange={upd("vatNumber")} placeholder={info.country + "U…"} />
                <div className="text-[11px] mt-1" style={{ color: "#7A7268" }}>{locale === "en" ? "EU VAT-IDs are validated via VIES." : "EU USt-IdNrn. werden via VIES geprueft."}</div>
              </div>
            </>
          )}
        </div>
        <div className="px-6 py-4 flex gap-3 justify-end border-t border-stone-300/70 sticky bottom-0 bg-[#F3EFE2]">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 rounded-md text-sm font-semibold border border-stone-400 bg-white text-stone-900 hover:bg-stone-50 disabled:opacity-60">
            {locale === "en" ? "Cancel" : "Abbrechen"}
          </button>
          <button onClick={save} disabled={saving || loading}
            className={`px-4 py-2 rounded-md text-sm font-semibold text-white ${(saving || loading) ? "bg-stone-400 cursor-not-allowed" : "btn-primary"}`}>
            {saving ? (locale === "en" ? "Saving..." : "Speichere...") : (locale === "en" ? "Save" : "Speichern")}
          </button>
        </div>
      </div>
    </div>
  );
}

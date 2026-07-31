"use client";
import { useEffect } from "react";
import { ETRACKER_KEY } from "@/lib/etracker-key";

type Props = {
  /** Eindeutige Vorgangsnummer (max 50 Zeichen, keine Kommas/Semikolons) */
  tonr: string;
  /** Netto-Umsatz in EUR. Nur bei Sale. */
  tval?: number;
  /** 0 = Lead, 1 = Sale, 2 = Vollstorno */
  tsale: 0 | 1 | 2;
};

declare global {
  interface Window {
    et_eC_Wrapper?: (opts: Record<string, unknown>) => void;
  }
}

/**
 * Feuert genau eine etracker-Conversion und rendert nichts.
 * - Dedup per sessionStorage: Reload/Re-Render darf nicht doppelt zaehlen.
 * - Das etracker-Script laedt async (afterInteractive) -> kurz pollen.
 * - Kein Consent-Gate hier: etracker laeuft cookieless (data-block-cookies),
 *   Conversion-Messung ist ohne Einwilligung zulaessig. Erst die spaeteren
 *   Ad-Click-ID-Cookies brauchen Opt-in.
 */
export default function EtrackerConversion({ tonr, tval, tsale }: Props) {
  useEffect(() => {
    if (!tonr) return;
    const safeTonr = tonr.replace(/[,;]/g, "-").slice(0, 50);
    const key = `et_conv_${safeTonr}_${tsale}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch { /* sessionStorage blockiert -> trotzdem senden */ }

    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fire = () => {
      if (typeof window.et_eC_Wrapper === "function") {
        window.et_eC_Wrapper({
          et_et: ETRACKER_KEY,
          et_tonr: safeTonr,
          et_tsale: tsale,
          ...(tval != null ? { et_tval: tval.toFixed(2) } : {})
        });
        try { sessionStorage.setItem(key, "1"); } catch { /* egal */ }
        return;
      }
      if (tries++ < 40) timer = setTimeout(fire, 250); // max ~10s warten
    };
    fire();
    return () => { if (timer) clearTimeout(timer); };
  }, [tonr, tval, tsale]);

  return null;
}

export { ETRACKER_KEY } from "@/lib/etracker-key";
import { PLANS, type PlanId } from "@/lib/chargebee";

/**
 * Conversion-Wert fuer etracker: NETTO in EUR, wie von etracker verlangt
 * (et_tval = Netto-Umsatz, Punkt als Dezimaltrennzeichen).
 * Quelle der Preise ist PLANS — nicht duplizieren.
 */
export function conversionValueEur(planId: PlanId, cycle: "monthly" | "yearly"): number {
  const p = PLANS[planId];
  return cycle === "yearly" ? p.yearlyPriceEur : p.basePriceEur;
}

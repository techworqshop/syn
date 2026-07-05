"use client";
import { useState, useEffect, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import PaymentMethodModal from "./PaymentMethodModal";
import BillingInfoModal from "./BillingInfoModal";
import type { PlanId } from "@/lib/chargebee";

type QuotaProps = {
  totalQuota: number; slotsInUse: number; remaining: number;
  consumed: number; drafts: number; purchasedExtras: number;
  bypass: boolean; planId: PlanId | null;
  cycle: "monthly" | "yearly" | null;
  periodEnd: string | null;
  scheduledPlanId: PlanId | null;
  scheduledCycle: "monthly" | "yearly" | null;
  scheduledChangeAt: string | null;
  pauseDate: string | null;
  resumeDate: string | null;
  status: string | null;
};
type PlanSwitchPreview = {
  direction: "upgrade" | "downgrade" | "same";
  newPlanId: PlanId;
  newCycle: "monthly" | "yearly";
  amountDueCents: number;
  subTotalCents: number;
  taxCents: number;
  currency: string;
  effectiveAt: string | null;
  endOfTerm: boolean;
  currentTermEnd: string | null;
  newIncludedSessions: number;
  currentSlotsInUse: number;
  currentBaseUsed: number;
};

type ExtrasRow = {
  id: string;
  createdAt: string;
  expiresAt: string | null;
  quantity: number;
  quantityUsed: number;
  unitPriceEur: number;
};

type Props = {
  locale: Locale;
  hasActiveSub: boolean;
  justActivated?: boolean;
  configured: boolean;
  quota: QuotaProps;
  extrasHistory?: ExtrasRow[];
};

type PlanCardData = {
  id: PlanId;
  name: string;
  basePrice: number;
  yearlyPrice: number;
  includedSessions: number;
  overagePerSession: number;
  highlight?: boolean;
};

const fmtEUR = (n: number, locale: Locale, decimals = 0) =>
  new Intl.NumberFormat(locale === "en" ? "en-GB" : "de-DE", {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals
  }).format(n);

const PLAN_CARDS: PlanCardData[] = [
  { id: "basic",      name: "Basic",      basePrice: 150, yearlyPrice: 1440, includedSessions: 5,  overagePerSession: 35 },
  { id: "pro",        name: "Pro",        basePrice: 350, yearlyPrice: 3360, includedSessions: 15, overagePerSession: 28, highlight: true },
  { id: "enterprise", name: "Enterprise", basePrice: 900, yearlyPrice: 8640, includedSessions: 50, overagePerSession: 22 }
];

export default function BillingActions({ locale, hasActiveSub, justActivated, configured, quota, extrasHistory = [] }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [confirmExtras, setConfirmExtras] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(justActivated ? (locale === "en" ? "Thanks for subscribing — your plan is active!" : "Vielen Dank — dein Abo ist aktiv!") : null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [planSwitchPreview, setPlanSwitchPreview] = useState<PlanSwitchPreview | null>(null);
  const [planSwitchError, setPlanSwitchError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBillingInfoModal, setShowBillingInfoModal] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  useEffect(() => {
    if (!justActivated) return;
    // Drop ?status=success so a reload doesn't re-trigger the banner.
    if (typeof window !== "undefined" && window.location.search.includes("status=")) {
      window.history.replaceState({}, "", "/app/billing");
    }
  }, [justActivated]);
  useEffect(() => {
    if (!hasActiveSub) return;
    fetch("/api/billing/invoices").then(r => r.json()).then(d => setInvoices(d.invoices || [])).catch(() => {});
  }, [hasActiveSub]);

  async function startCheckout(plan: PlanId) {
    setError(null); setLoading(`checkout-${plan}`);
    try {
      const r = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, cycle })
      });
      if (!r.ok) throw new Error(await r.text() || `HTTP ${r.status}`);
      const j = await r.json();
      if (j.url) { window.location.href = j.url; return; }
      throw new Error("No redirect URL returned");
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
      setLoading(null);
    }
  }

  async function buyExtras(quantity: number) {
    setError(null); setLoading(`extras-${quantity}`);
    try {
      const r = await fetch("/api/billing/buy-extras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity })
      });
      if (!r.ok) throw new Error(await r.text() || `HTTP ${r.status}`);
      const j = await r.json().catch(() => ({})) as { quantity?: number; unitPriceEur?: number };
      const total = fmtEUR((j.quantity ?? quantity) * (j.unitPriceEur ?? 0) * 1.19, locale, 2);
      setConfirmExtras(null);
      setSuccessMsg(locale === "en"
        ? `${j.quantity ?? quantity} extra session(s) added. EUR ${total} (incl. VAT) charged to your payment method.`
        : `${j.quantity ?? quantity} Session(s) hinzugefuegt. EUR ${total} (inkl. MwSt.) wurden von deiner Zahlungsmethode abgebucht.`);
      setTimeout(() => window.location.reload(), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
      setLoading(null);
    }
  }

  async function doCancel() {
    setError(null); setLoading("cancel");
    try {
      const r = await fetch("/api/billing/cancel", { method: "POST" });
      if (!r.ok) throw new Error(await r.text() || `HTTP ${r.status}`);
      setConfirmCancel(false);
      setSuccessMsg(locale === "en" ? "Subscription cancelled at end of term." : "Abo zum Periodenende gekuendigt.");
      setTimeout(() => window.location.reload(), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
      setLoading(null);
    }
  }

  async function doResumeCancel() {
    setError(null); setLoading("resume-cancel");
    try {
      const r = await fetch("/api/billing/resume-cancel", { method: "POST" });
      if (!r.ok) throw new Error(await r.text() || `HTTP ${r.status}`);
      setSuccessMsg(locale === "en" ? "Cancellation reverted. Reloading..." : "Kuendigung zurueckgenommen. Lade...");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
      setLoading(null);
    }
  }

  async function doCollectInvoice(invoiceId: string) {
    setError(null); setLoading(`collect-${invoiceId}`);
    try {
      const r = await fetch(`/api/billing/invoices/${invoiceId}/collect`, { method: "POST" });
      if (!r.ok) throw new Error(await r.text() || `HTTP ${r.status}`);
      setSuccessMsg(locale === "en" ? "Payment retried successfully. Reloading..." : "Zahlung erfolgreich. Lade...");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "retry failed");
      setLoading(null);
    }
  }

  async function doPause(months: number) {
    setError(null); setLoading(`pause-${months}`);
    try {
      const r = await fetch("/api/billing/pause", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months })
      });
      if (!r.ok) throw new Error(await r.text() || `HTTP ${r.status}`);
      setShowPauseModal(false);
      setSuccessMsg(locale === "en" ? "Subscription paused. Reloading..." : "Abo pausiert. Lade...");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "pause failed");
      setLoading(null);
    }
  }

  async function revertScheduled() {
    setError(null); setLoading("revert-scheduled");
    try {
      const r = await fetch("/api/billing/revert-scheduled", { method: "POST" });
      const j = await r.json().catch(() => ({})) as { error?: string };
      if (!r.ok) throw new Error(j?.error || "revert failed");
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
      setLoading(null);
    }
  }

  async function doResumePause() {
    setError(null); setLoading("resume-pause");
    try {
      const r = await fetch("/api/billing/resume-pause", { method: "POST" });
      if (!r.ok) throw new Error(await r.text() || `HTTP ${r.status}`);
      setSuccessMsg(locale === "en" ? "Subscription resumed. Reloading..." : "Abo fortgesetzt. Lade...");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "resume failed");
      setLoading(null);
    }
  }

  async function requestPlanSwitch(planId: PlanId, switchCycle: "monthly"|"yearly") {
    setError(null); setPlanSwitchError(null); setLoading(`preview-${planId}`);
    try {
      const r = await fetch("/api/billing/change-plan/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, cycle: switchCycle })
      });
      if (!r.ok) throw new Error(await r.text() || `HTTP ${r.status}`);
      const j = await r.json() as PlanSwitchPreview;
      setPlanSwitchPreview(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "preview failed");
    } finally {
      setLoading(null);
    }
  }

  async function confirmPlanSwitch() {
    if (!planSwitchPreview) return;
    setPlanSwitchError(null); setLoading(`switch-${planSwitchPreview.newPlanId}`);
    try {
      const r = await fetch("/api/billing/change-plan", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planSwitchPreview.newPlanId,
          cycle: planSwitchPreview.newCycle,
          confirmedDirection: planSwitchPreview.direction
        })
      });
      if (!r.ok) throw new Error(await r.text() || `HTTP ${r.status}`);
      setPlanSwitchPreview(null);
      const msg = planSwitchPreview.endOfTerm
        ? (locale === "en" ? "Downgrade scheduled. Reloading..." : "Downgrade geplant. Lade...")
        : (locale === "en" ? "Plan switched. Reloading..." : "Plan gewechselt. Lade...");
      setSuccessMsg(msg);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setPlanSwitchError(e instanceof Error ? e.message : "switch failed");
      setLoading(null);
    }
  }

  function doPaymentUpdate() {
    setError(null);
    setShowPaymentModal(true);
  }

  async function openPortal() {
    setError(null); setLoading("portal");
    try {
      const r = await fetch("/api/billing/portal", { method: "POST" });
      if (!r.ok) throw new Error(await r.text() || `HTTP ${r.status}`);
      const j = await r.json();
      if (j.url) { window.location.href = j.url; return; }
      throw new Error("No redirect URL returned");
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
      setLoading(null);
    }
  }

  if (hasActiveSub) {
    const OVERAGE: Record<PlanId, number> = { basic: 35, pro: 28, enterprise: 22 };
    const unitNet = quota.planId ? OVERAGE[quota.planId] : 0;
    return (
      <>
        <div className="space-y-4">
          {error && (
            <div className="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm" style={{ color: "#9F1239" }}>{error}</div>
          )}
          {successMsg && (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm" style={{ color: "#0F5132" }}>{successMsg}</div>
          )}
        {(quota.status === "unpaid" || invoices.some(i => i.status !== "paid" && i.status !== "voided")) && (
          <div className="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm" style={{ color: "#9F1239" }}>
            <div className="font-semibold mb-0.5">
              {locale === "en" ? "Payment failed" : "Zahlung fehlgeschlagen"}
            </div>
            <div className="text-xs mb-2">
              {locale === "en"
                ? "Your last payment could not be collected. Please update your payment method or retry the charge to avoid interruption."
                : "Deine letzte Zahlung konnte nicht eingezogen werden. Bitte aktualisiere die Zahlungsmethode oder versuche es erneut, um Unterbrechungen zu vermeiden."}
            </div>
            <button onClick={doPaymentUpdate} disabled={loading !== null}
              className="px-3 py-1.5 rounded-md text-xs font-semibold border border-stone-400 bg-white text-stone-900 hover:bg-stone-50 disabled:opacity-60">
              {locale === "en" ? "Update payment method" : "Zahlungsmethode aendern"}
            </button>
          </div>
        )}
        <QuotaCard locale={locale} quota={quota} loading={loading} onBuy={(qty) => { setError(null); setConfirmExtras(qty); }} />
        <div className="rounded-md border border-stone-300 bg-[#F3EFE2] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-300/70 text-xs uppercase tracking-wider font-semibold" style={{ color: "#7A7268" }}>
            {locale === "en" ? "Manage subscription" : "Abo verwalten"}
          </div>
          <PlanSwitcher locale={locale} quota={quota} loading={loading}
            onPlanSwitch={requestPlanSwitch} onPaymentUpdate={doPaymentUpdate}
            onCancel={() => setConfirmCancel(true)} onResumeCancel={doResumeCancel} onPauseRequest={() => setShowPauseModal(true)} onResumePause={doResumePause} onRevertScheduled={revertScheduled} onEditBilling={() => setShowBillingInfoModal(true)} />
        </div>
        <InvoicesList locale={locale} invoices={invoices} onCollect={doCollectInvoice} loading={loading} />
        <p className="text-xs" style={{ color: "#7A7268" }}>
          {locale === "en"
            ? "Payments are processed by Chargebee. You'll be redirected to a secure hosted page."
            : "Zahlungen werden ueber Chargebee abgewickelt. Du wirst zu einer sicheren externen Seite weitergeleitet."}
          </p>
        </div>
        {confirmExtras !== null && (
          <ConfirmExtrasModal
            locale={locale}
            quantity={confirmExtras}
            unitNet={unitNet}
            busy={loading?.startsWith("extras-") ?? false}
            onCancel={() => setConfirmExtras(null)}
            onConfirm={() => buyExtras(confirmExtras)}
          />
        )}
        {showPauseModal && (
          <ConfirmPauseModal
            locale={locale}
            busy={(loading ?? "").startsWith("pause-")}
            onCancel={() => setShowPauseModal(false)}
            onConfirm={doPause}
          />
        )}
        {planSwitchPreview && (
          <ConfirmPlanSwitchModal
            locale={locale}
            preview={planSwitchPreview}
            currentPlanId={quota.planId}
            busy={loading?.startsWith("switch-") ?? false}
            error={planSwitchError}
            onCancel={() => { setPlanSwitchPreview(null); setPlanSwitchError(null); }}
            onConfirm={confirmPlanSwitch}
          />
        )}
        {confirmCancel && (
          <ConfirmCancelModal
            locale={locale}
            periodEnd={quota.periodEnd}
            scheduledPlanId={quota.scheduledPlanId}
            busy={loading === "cancel"}
            onCancel={() => setConfirmCancel(false)}
            onConfirm={doCancel}
          />
        )}
        {showBillingInfoModal && (
          <BillingInfoModal
            locale={locale}
            onClose={() => setShowBillingInfoModal(false)}
            onSuccess={() => {
              setShowBillingInfoModal(false);
              setSuccessMsg(locale === "en" ? "Billing details updated." : "Rechnungsdaten aktualisiert.");
            }}
          />
        )}
        {showPaymentModal && (
          <PaymentMethodModal
            locale={locale}
            onClose={() => setShowPaymentModal(false)}
            onSuccess={() => {
              setShowPaymentModal(false);
              setSuccessMsg(locale === "en" ? "Card updated successfully." : "Karte erfolgreich aktualisiert.");
            }}
          />
        )}
      </>
    );
  }

  // No active sub -> 3-tier picker
  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm" style={{ color: "#9F1239" }}>{error}</div>
      )}
      <div className="flex items-center justify-center mb-4">
        <div className="inline-flex rounded-full border border-stone-300 bg-white p-1 shadow-sm">
          <button onClick={() => setCycle("yearly")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${cycle === "yearly" ? "bg-rose-700 text-white" : "text-stone-700 hover:text-rose-700"}`}>
            {locale === "en" ? "Yearly" : "Jaehrlich"}
            <span className={`ml-1.5 text-[10px] font-bold ${cycle === "yearly" ? "text-rose-100" : "text-emerald-700"}`}>-20%</span>
          </button>
          <button onClick={() => setCycle("monthly")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${cycle === "monthly" ? "bg-rose-700 text-white" : "text-stone-700 hover:text-rose-700"}`}>
            {locale === "en" ? "Monthly" : "Monatlich"}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLAN_CARDS.map(p => {
          const busy = loading === `checkout-${p.id}`;
          const anyBusy = loading !== null;
          const cta = busy
            ? (locale === "en" ? "Loading..." : "Lade...")
            : (locale === "en" ? "Subscribe now" : "Jetzt abonnieren");
          return (
            <div key={p.id} className={`rounded-md border bg-[#F3EFE2] shadow-sm flex flex-col relative ${p.highlight ? "border-rose-700 ring-2 ring-rose-700/30" : "border-stone-300"}`}>
              <div className="px-5 py-4 border-b border-stone-300/70 relative">
                {p.highlight && (
                  <span className="absolute -top-2 right-4 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ background: "#9F1239" }}>
                    {locale === "en" ? "MOST POPULAR" : "BELIEBT"}
                  </span>
                )}
                <div className="text-lg font-semibold tracking-tight" style={{ color: "#1F2420" }}>{p.name}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold" style={{ color: "#1F2420" }}>{p.id === "enterprise" ? "ab " : ""}€{fmtEUR(cycle === "yearly" ? Math.round(p.yearlyPrice / 12) : p.basePrice, locale)}</span>
                  <span className="text-sm" style={{ color: "#7A7268" }}>/{locale === "en" ? "mo" : "Mo"}</span>
                </div>
                <div className="text-xs mt-1" style={{ color: "#7A7268" }}>
                  {cycle === "yearly"
                    ? (locale === "en" ? `€${fmtEUR(p.yearlyPrice, locale)} billed annually` : `€${fmtEUR(p.yearlyPrice, locale)} pro Jahr`)
                    : (locale === "en" ? "Billed monthly" : "Monatliche Abrechnung")}
                </div>
              </div>
              <div className="px-5 py-4 flex-1 space-y-2 text-sm" style={{ color: "#1F2420" }}>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-700 mt-0.5">✓</span>
                  <span><span className="font-semibold">{p.includedSessions}</span> {locale === "en" ? "sessions / month included" : "Sessions / Monat inklusive"}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-700 mt-0.5">✓</span>
                  <span>{locale === "en" ? "Each additional session:" : "Jede weitere Session:"} <span className="font-semibold">€{p.overagePerSession}</span></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-700 mt-0.5">✓</span>
                  <span>{locale === "en" ? "Cancel anytime" : "Jederzeit kuendbar"}</span>
                </div>
              </div>
              <div className="px-5 pb-5">
                <button disabled={anyBusy || !configured} onClick={() => startCheckout(p.id)}
                  className={`w-full px-4 py-2.5 rounded-md font-semibold transition-all ${(!configured || anyBusy) ? "text-stone-400 bg-stone-200/60 cursor-not-allowed" : p.highlight ? "btn-primary text-white" : "border border-stone-400 bg-white text-stone-900 hover:bg-stone-50"}`}>
                  {cta}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs" style={{ color: "#7A7268" }}>
        {locale === "en"
          ? "Payments are processed by Chargebee. You'll be redirected to a secure hosted page."
          : "Zahlungen werden ueber Chargebee abgewickelt. Du wirst zu einer sicheren externen Seite weitergeleitet."}
      </p>
    </div>
  );
}

type QuotaCardProps = {
  locale: Locale;
  quota: QuotaProps;
  loading: string | null;
  onBuy: (qty: number) => void;
};

function QuotaCard({ locale, quota, loading, onBuy }: QuotaCardProps) {
  if (quota.bypass) {
    return (
      <div className="rounded-md border border-stone-300 bg-[#F3EFE2] px-6 py-5 text-sm" style={{ color: "#7A7268" }}>
        {locale === "en" ? "Admin account — unlimited sessions." : "Admin-Account — unbegrenzte Sessions."}
      </div>
    );
  }

  const pct = quota.totalQuota === 0 ? 100 : Math.min(100, Math.round((quota.slotsInUse / quota.totalQuota) * 100));
  const barColor = pct >= 90 ? "#9F1239" : pct >= 70 ? "#A77E22" : "#3A7E58";

  return (
    <div className="rounded-md border border-stone-300 bg-[#F3EFE2] shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-stone-300/70">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="text-xs uppercase tracking-wider font-semibold" style={{ color: "#7A7268" }}>
            {locale === "en" ? "This month's sessions" : "Sessions diesen Monat"}
          </div>
          {quota.cycle && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ring-stone-300 bg-white" style={{ color: quota.cycle === "yearly" ? "#3A7E58" : "#7A7268" }}>
              {quota.cycle === "yearly" ? (locale === "en" ? "YEARLY -20%" : "JAEHRLICH -20%") : (locale === "en" ? "MONTHLY" : "MONATLICH")}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold" style={{ color: "#1F2420" }}>{quota.slotsInUse}</span>
          <span className="text-base" style={{ color: "#7A7268" }}>/ {quota.totalQuota}</span>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-stone-300/40 overflow-hidden">
          <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
        </div>
        <div className="mt-2 text-xs flex gap-4" style={{ color: "#7A7268" }}>
          <span>{locale === "en" ? "Started" : "Begonnen"}: <span className="font-semibold" style={{ color: "#1F2420" }}>{quota.consumed}</span></span>
          <span>{locale === "en" ? "Drafts" : "Entwuerfe"}: <span className="font-semibold" style={{ color: "#1F2420" }}>{quota.drafts}</span></span>
          {quota.purchasedExtras > 0 && (
            <span>{locale === "en" ? "Extras" : "Extras"}: <span className="font-semibold" style={{ color: "#1F2420" }}>+{quota.purchasedExtras}</span></span>
          )}
        </div>
      </div>
      <div className="px-6 py-5">
        <div className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "#7A7268" }}>
          {locale === "en" ? "Buy extra sessions" : "Sessions nachkaufen"}
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 5, 10].map(qty => {
            const busy = loading === `extras-${qty}`;
            const anyBusy = loading !== null;
            return (
              <button key={qty} disabled={anyBusy} onClick={() => onBuy(qty)}
                className={`px-4 py-2 rounded-md text-sm font-semibold border transition-all ${anyBusy ? "text-stone-400 bg-stone-100 border-stone-300 cursor-not-allowed" : "bg-white border-stone-400 text-stone-900 hover:border-rose-700 hover:text-rose-700"}`}>
                {busy ? "..." : `+${qty}`}
              </button>
            );
          })}
        </div>
        <p className="text-xs mt-2" style={{ color: "#7A7268" }}>
          {locale === "en"
            ? "Extras are billed immediately at your plan's per-session rate, remain valid for 12 months from purchase, and are used once your monthly quota is exhausted."
            : "Extras werden sofort zum Tier-Preis pro Session abgerechnet, sind 12 Monate ab Kauf gueltig und werden eingesetzt, sobald dein Monatskontingent aufgebraucht ist."}
        </p>
        {quota.periodEnd && (
          <p className="text-xs mt-2" style={{ color: "#7A7268" }}>
            {locale === "en" ? "Renews on " : "Verlaengert am "}
            <span className="font-semibold" style={{ color: "#1F2420" }}>
              {new Date(quota.periodEnd).toLocaleDateString(locale === "en" ? "en-GB" : "de-DE", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

type ConfirmExtrasProps = {
  locale: Locale;
  quantity: number;
  unitNet: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function ConfirmExtrasModal({ locale, quantity, unitNet, busy, onCancel, onConfirm }: ConfirmExtrasProps) {
  const net = unitNet * quantity;
  const vat = net * 0.19;
  const gross = net + vat;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-md bg-[#F3EFE2] border border-stone-300 shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-stone-300/70">
          <div className="text-lg font-semibold" style={{ color: "#1F2420" }}>
            {locale === "en" ? "Confirm purchase" : "Kauf bestaetigen"}
          </div>
          <div className="text-sm mt-1" style={{ color: "#7A7268" }}>
            {locale === "en"
              ? `You are about to buy ${quantity} extra session${quantity === 1 ? "" : "s"} .`
              : `Du kaufst ${quantity} zusaetzliche Session${quantity === 1 ? "" : "s"} .`}
          </div>
        </div>
        <div className="px-6 py-5 space-y-2 text-sm" style={{ color: "#1F2420" }}>
          <div className="flex justify-between"><span>{quantity} × {locale === "en" ? "Session" : "Session"}</span><span>€{fmtEUR(net, locale, 2)}</span></div>
          <div className="flex justify-between" style={{ color: "#7A7268" }}><span>{locale === "en" ? "VAT 19%" : "MwSt. 19%"}</span><span>€{fmtEUR(vat, locale, 2)}</span></div>
          <div className="flex justify-between text-base font-semibold pt-2 mt-2 border-t border-stone-300/70">
            <span>{locale === "en" ? "Total" : "Gesamt"}</span><span>€{fmtEUR(gross, locale, 2)}</span>
          </div>
        </div>
        <div className="px-6 pb-2 text-xs" style={{ color: "#7A7268" }}>
          {locale === "en"
            ? "Will be charged immediately to your saved payment method. VAT may differ based on your billing country and VAT-ID validation."
            : "Wird sofort von deiner hinterlegten Zahlungsmethode abgebucht. MwSt. kann je nach Land und USt-ID-Validierung abweichen."}
        </div>
        <div className="px-6 py-5 flex gap-3 justify-end">
          <button disabled={busy} onClick={onCancel}
            className="px-4 py-2 rounded-md text-sm font-semibold border border-stone-400 bg-white text-stone-900 hover:bg-stone-50 disabled:opacity-60">
            {locale === "en" ? "Cancel" : "Abbrechen"}
          </button>
          <button disabled={busy} onClick={onConfirm}
            className={`px-4 py-2 rounded-md text-sm font-semibold text-white ${busy ? "bg-stone-400 cursor-not-allowed" : "btn-primary"}`}>
            {busy
              ? (locale === "en" ? "Charging..." : "Wird abgebucht...")
              : (locale === "en" ? `Buy now for €${fmtEUR(gross, locale, 2)}` : `Jetzt zahlungspflichtig kaufen — €${fmtEUR(gross, locale, 2)}`)}
          </button>
        </div>
      </div>
    </div>
  );
}

type ControlsProps = {
  locale: Locale;
  quota: QuotaProps;
  loading: string | null;
  onPlanSwitch: (p: PlanId, cycle: "monthly"|"yearly") => void;
  onPaymentUpdate: () => void;
  onCancel: () => void;
  onResumeCancel: () => void;
  onPauseRequest: () => void;
  onResumePause: () => void; onRevertScheduled: () => void;
  onEditBilling: () => void;
};

function PlanSwitcher({ locale, quota, loading, onPlanSwitch, onPaymentUpdate, onCancel, onResumeCancel, onPauseRequest, onResumePause, onRevertScheduled, onEditBilling }: ControlsProps) {
  const cur = quota.planId;
  const curCycle = (quota.cycle ?? "monthly") as "monthly" | "yearly";
  const [selectedCycle, setSelectedCycle] = useState<"monthly" | "yearly">(curCycle);
  const anyBusy = loading !== null;
  const pendingPause = quota.status === "active" && !!quota.pauseDate && new Date(quota.pauseDate).getTime() > Date.now();
  const locked = quota.status === "unpaid";
  if (locked) {
    return (
      <div className="mx-4 my-4 rounded-md border border-rose-300 bg-rose-50 px-5 py-4 text-sm" style={{ color: "#9F1239" }}>
        <div className="font-semibold mb-1">
          {locale === "en" ? "Plan changes paused" : "Plan-Wechsel pausiert"}
        </div>
        <div className="text-xs mb-3">
          {locale === "en"
            ? "Your subscription is currently not in a switchable state. Please update your payment method, then plan changes will be available again."
            : "Dein Abo ist im Moment nicht wechselbar. Bitte aktualisiere zuerst die Zahlungsmethode, danach werden Plan-Wechsel wieder verfuegbar."}
        </div>
        <button onClick={onPaymentUpdate}
          className="px-3 py-1.5 rounded-md text-xs font-semibold border border-stone-400 bg-white text-stone-900 hover:bg-stone-50">
          {locale === "en" ? "Update payment method" : "Zahlungsmethode aendern"}
        </button>
      </div>
    );
  }
  return (
    <>
      <div className="flex items-center justify-center pt-4">
        <div className="inline-flex rounded-full border border-stone-300 bg-white p-1 shadow-sm">
          <button onClick={() => setSelectedCycle("yearly")}
            className={`px-4 py-1 rounded-full text-xs font-semibold transition-colors ${selectedCycle === "yearly" ? "bg-rose-700 text-white" : "text-stone-700 hover:text-rose-700"}`}>
            {locale === "en" ? "Yearly" : "Jaehrlich"}
            <span className={`ml-1.5 text-[10px] font-bold ${selectedCycle === "yearly" ? "text-rose-100" : "text-emerald-700"}`}>-20%</span>
          </button>
          <button onClick={() => setSelectedCycle("monthly")}
            className={`px-4 py-1 rounded-full text-xs font-semibold transition-colors ${selectedCycle === "monthly" ? "bg-rose-700 text-white" : "text-stone-700 hover:text-rose-700"}`}>
            {locale === "en" ? "Monthly" : "Monatlich"}
          </button>
        </div>
      </div>
      {pendingPause && quota.pauseDate && quota.resumeDate && (
        <div className="mx-4 mt-3 rounded-md border border-amber-700/40 bg-amber-50 px-4 py-3 text-sm" style={{ color: "#7A4E13" }}>
          <div className="font-semibold mb-0.5">
            {locale === "en" ? "Pause scheduled" : "Pause geplant"}
          </div>
          <div className="text-xs mb-2">
            {locale === "en"
              ? <>Your subscription will pause on <b>{new Date(quota.pauseDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</b> and resume on <b>{new Date(quota.resumeDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</b>. Until then, your plan stays active.</>
              : <>Dein Abo pausiert am <b>{new Date(quota.pauseDate).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}</b> und laeuft wieder ab <b>{new Date(quota.resumeDate).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}</b>. Bis dahin bleibt dein Plan aktiv.</>}
          </div>
          <button onClick={onResumePause} disabled={anyBusy}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border border-stone-400 bg-white text-stone-900 hover:bg-stone-50 ${anyBusy ? "opacity-60 cursor-not-allowed" : ""}`}>
            {loading === "resume-pause" ? "..." : (locale === "en" ? "Cancel scheduled pause" : "Geplante Pause aufheben")}
          </button>
        </div>
      )}
      {quota.status === "paused" && (
        <div className="mx-4 mt-3 rounded-md border border-stone-400 bg-stone-50 px-4 py-3 text-sm" style={{ color: "#4A4640" }}>
          <div className="font-semibold mb-0.5">
            {locale === "en" ? "Subscription paused" : "Abo pausiert"}
          </div>
          <div className="text-xs mb-2">
            {locale === "en"
              ? "No charges or renewals while paused. Resumes automatically — or set it back yourself."
              : "Keine Abbuchungen waehrend der Pause. Setzt sich automatisch fort — oder du startest manuell."}
          </div>
          <button onClick={onResumePause} disabled={anyBusy}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold text-white ${anyBusy ? "bg-stone-400 cursor-not-allowed" : "btn-primary"}`}>
            {loading === "resume-pause" ? "..." : (locale === "en" ? "Resume now" : "Jetzt fortsetzen")}
          </button>
        </div>
      )}
      {quota.status === "non_renewing" && quota.periodEnd && (
        <div className="mx-4 mt-3 rounded-md border border-amber-700/40 bg-amber-50 px-4 py-3 text-sm" style={{ color: "#7A4E13" }}>
          <div className="font-semibold mb-0.5">
            {locale === "en" ? "Subscription ending" : "Abo gekuendigt"}
          </div>
          <div className="text-xs mb-2">
            {locale === "en"
              ? <>Your subscription stays active until <b>{new Date(quota.periodEnd).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</b>. After that no new sessions will be available beyond purchased extras.</>
              : <>Dein Abo bleibt aktiv bis <b>{new Date(quota.periodEnd).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}</b>. Danach sind keine neuen Sessions ueber dein Inklusiv-Kontingent moeglich.</>}
          </div>
          <button onClick={onResumeCancel} disabled={anyBusy}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold text-white ${anyBusy ? "bg-stone-400 cursor-not-allowed" : "btn-primary"}`}>
            {loading === "resume-cancel" ? "..." : (locale === "en" ? "Undo cancellation" : "Kuendigung zuruecknehmen")}
          </button>
        </div>
      )}
      {quota.scheduledPlanId && quota.scheduledChangeAt && quota.status !== "non_renewing" && (
        <div className="mx-4 mt-3 rounded-md border border-amber-700/40 bg-amber-50 px-4 py-3 text-sm" style={{ color: "#7A4E13" }}>
          <div className="font-semibold mb-0.5">
            {locale === "en" ? "Downgrade scheduled" : "Downgrade geplant"}
          </div>
          <div className="text-xs">
            {locale === "en"
              ? <>Your subscription will switch to <b>Syn {quota.scheduledPlanId.charAt(0).toUpperCase()}{quota.scheduledPlanId.slice(1)}</b> on <b>{new Date(quota.scheduledChangeAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</b>. Until then, your current plan stays active.</>
              : <>Dein Abo wechselt am <b>{new Date(quota.scheduledChangeAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}</b> auf <b>Syn {quota.scheduledPlanId.charAt(0).toUpperCase()}{quota.scheduledPlanId.slice(1)}</b>. Bis dahin bleibt dein aktueller Plan aktiv.</>}
          </div>
          <button disabled={loading !== null} onClick={onRevertScheduled}
            className="mt-2 px-3 py-1.5 rounded-md border border-amber-700/50 bg-white text-xs font-semibold hover:bg-amber-100 transition-colors" style={{ color: "#7A4E13" }}>
            {loading === "revert-scheduled" ? "..." : (locale === "en" ? "Revert scheduled change" : "Geplanten Wechsel zuruecknehmen")}
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-4 pt-3 pb-1">
        {PLAN_CARDS.map(p => {
          const isActive = p.id === cur && selectedCycle === curCycle;
          const switchBusy = loading === `switch-${p.id}` || loading === `preview-${p.id}`;
          const previewBusy = loading === `preview-${p.id}`;
          const priceRaw = selectedCycle === "yearly" ? Math.round(p.yearlyPrice / 12) : p.basePrice;
          const price = fmtEUR(priceRaw, locale);
          return (
            <button
              key={p.id}
              type="button"
              disabled={isActive || anyBusy}
              onClick={() => !isActive && onPlanSwitch(p.id, selectedCycle)}
              className={`relative rounded-md border p-4 text-left transition-all ${
                isActive
                  ? "border-rose-700 bg-rose-50/60 ring-2 ring-rose-700/30 cursor-default"
                  : anyBusy
                    ? "border-stone-300 bg-white/50 opacity-60 cursor-not-allowed"
                    : "border-stone-300 bg-white hover:border-rose-700 hover:shadow-md cursor-pointer"
              }`}
            >
              {isActive && (
                <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ background: "#3A7E58" }}>
                  {locale === "en" ? "ACTIVE" : "AKTIV"}
                </span>
              )}
              <div className="font-semibold text-base" style={{ color: "#1F2420" }}>Syn {p.name}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-semibold" style={{ color: "#1F2420" }}>
                  {p.id === "enterprise" ? (locale === "en" ? "from " : "ab ") : ""}€{price}
                </span>
                <span className="text-xs" style={{ color: "#7A7268" }}>/{locale === "en" ? "mo" : "Mo"}</span>
              </div>
              <div className="text-xs mt-1" style={{ color: "#7A7268" }}>
                {selectedCycle === "yearly"
                  ? (locale === "en" ? `€${fmtEUR(p.yearlyPrice, locale)} / year` : `€${fmtEUR(p.yearlyPrice, locale)} / Jahr`)
                  : (locale === "en" ? "Billed monthly" : "Monatlich")}
              </div>
              <div className="mt-3 text-xs space-y-1" style={{ color: "#4A4640" }}>
                <div><span className="font-semibold">{p.includedSessions}</span> {locale === "en" ? "sessions/mo" : "Sessions/Mo"}</div>
                <div>{locale === "en" ? "Each extra:" : "Jede weitere:"} <span className="font-semibold">€{p.overagePerSession}</span></div>
              </div>
              {switchBusy && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-md">
                  <span className="text-xs font-semibold text-stone-700">{previewBusy ? (locale === "en" ? "Loading..." : "Lade...") : (locale === "en" ? "Switching..." : "Wechsle...")}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="px-4 pb-4 pt-3 flex justify-between items-start gap-3 flex-wrap">
        <div className="flex flex-col gap-2">
          <button disabled={anyBusy} onClick={onPaymentUpdate}
            className={`px-4 py-2 rounded-md text-sm font-semibold border border-stone-400 bg-white text-stone-900 hover:bg-stone-50 ${anyBusy ? "opacity-60 cursor-not-allowed" : ""}`}>
            {locale === "en" ? "Update payment method" : "Zahlungsmethode aendern"}
          </button>
          <button disabled={anyBusy} onClick={onEditBilling}
            className={`px-4 py-2 rounded-md text-sm font-semibold border border-stone-400 bg-white text-stone-900 hover:bg-stone-50 ${anyBusy ? "opacity-60 cursor-not-allowed" : ""}`}>
            {loading === "portal" ? "..." : (locale === "en" ? "Edit billing details" : "Rechnungsdaten aendern")}
          </button>
        </div>
        <div className="flex flex-col gap-2 items-end">
          {quota.status === "active" && !pendingPause && (
            <button disabled={anyBusy} onClick={onPauseRequest}
              className={`px-4 py-2 rounded-md text-sm font-semibold border border-stone-400 bg-white text-stone-900 hover:bg-stone-50 ${anyBusy ? "opacity-60 cursor-not-allowed" : ""}`}>
              {locale === "en" ? "Pause subscription" : "Abo pausieren"}
            </button>
          )}
          {quota.status === "non_renewing" ? (
            <button disabled={anyBusy} onClick={onResumeCancel}
              className={`px-4 py-2 rounded-md text-sm font-semibold text-white ${anyBusy ? "bg-stone-400 cursor-not-allowed" : "btn-primary"}`}>
              {loading === "resume-cancel" ? "..." : (locale === "en" ? "Reactivate subscription" : "Abo reaktivieren")}
            </button>
          ) : (
            <button disabled={anyBusy} onClick={onCancel}
              className={`px-4 py-2 rounded-md text-sm font-semibold border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 ${anyBusy ? "opacity-60 cursor-not-allowed" : ""}`}>
              {locale === "en" ? "Cancel subscription" : "Abo kuendigen"}
            </button>
          )}
        </div>
      </div>
      {quota.periodEnd && (
        <div className="px-6 pb-4 pt-1 text-xs" style={{ color: "#7A7268" }}>
          {locale === "en" ? "Renews on " : "Verlaengert sich am "}
          <span className="font-semibold" style={{ color: "#4A4640" }}>
            {new Date(quota.periodEnd).toLocaleDateString(locale === "en" ? "en-GB" : "de-DE", { day: "2-digit", month: "long", year: "numeric" })}
          </span>
        </div>
      )}
    </>
  );
}

type InvoiceRow =
  | { id: string; date: number; total: number; amountPaid?: number; status: string; currency: string;
      type: "extras"; quantity: number; expiresAt: string | null; unitPriceEur: number }
  | { id: string; date: number; total: number; amountPaid?: number; status: string; currency: string;
      type: "subscription"; planId: PlanId | null; cycle: "monthly" | "yearly" | null;
      periodStart: number | null; periodEnd: number | null }
  | { id: string; date: number; total: number; amountPaid?: number; status: string; currency: string;
      type: "credit_note" };

type InvoiceProps = {
  locale: Locale;
  invoices: InvoiceRow[];
  onCollect: (id: string) => void;
  loading: string | null;
};

function InvoicesList({ locale, invoices, onCollect, loading }: InvoiceProps) {
  if (!invoices.length) return null;
  const dateLocale = locale === "en" ? "en-GB" : "de-DE";
  const fmtSec = (ts: number) => new Date(ts * 1000).toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric" });
  const fmtISO = (iso: string) => new Date(iso).toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric" });
  const planLabel = (id: PlanId | null) => id ? `Syn ${id.charAt(0).toUpperCase()}${id.slice(1)}` : "Syn";
  return (
    <div className="rounded-md border border-stone-300 bg-[#F3EFE2] shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-300/70 text-xs uppercase tracking-wider font-semibold" style={{ color: "#7A7268" }}>
        {locale === "en" ? "Purchases & Invoices" : "Kaeufe & Rechnungen"}
      </div>
      <div className="divide-y divide-stone-300/50">
        {invoices.map(inv => {
          const amount = fmtEUR(inv.total / 100, locale, 2);
          const isPaid = inv.status === "paid";
          const isCredit = inv.type === "credit_note";
          const cnStatus = inv.status === "refunded" ? (locale === "en" ? "Refunded" : "Erstattet") : inv.status === "adjusted" ? (locale === "en" ? "Applied" : "Verrechnet") : inv.status === "refund_due" ? (locale === "en" ? "Refund pending" : "Erstattung ausstehend") : inv.status;
          const issueDate = fmtSec(inv.date);
          let title: ReactNode;
          let subtitle: ReactNode;
          if (inv.type === "extras") {
            const q = inv.quantity;
            const sessionWord = locale === "en" ? (q === 1 ? "Session" : "Sessions") : (q === 1 ? "Session" : "Sessions");
            title = (
              <span className="font-semibold" style={{ color: "#1F2420" }}>
                {q} {sessionWord} {locale === "en" ? "purchased" : "zugekauft"}
              </span>
            );
            const validUntil = inv.expiresAt ? fmtISO(inv.expiresAt) : "—";
            subtitle = (
              <span>
                {locale === "en" ? "Valid until " : "Gueltig bis "}
                <span className="font-medium" style={{ color: "#4A4640" }}>{validUntil}</span>
                <span className="mx-1.5">·</span>
                {locale === "en" ? "Issued " : "Ausgestellt "}{issueDate}
              </span>
            );
          } else if (inv.type === "subscription") {
            const planName = planLabel(inv.planId);
            const cycleLbl = inv.cycle === "yearly" ? (locale === "en" ? "annual" : "jaehrlich") : (locale === "en" ? "monthly" : "monatlich");
            title = (
              <span className="font-semibold" style={{ color: "#1F2420" }}>
                {locale === "en" ? `Subscription ${planName}` : `Abo ${planName}`}
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 ring-stone-300 bg-white" style={{ color: "#7A7268" }}>
                  {cycleLbl}
                </span>
              </span>
            );
            const period = inv.periodStart && inv.periodEnd
              ? `${fmtSec(inv.periodStart)} – ${fmtSec(inv.periodEnd)}`
              : issueDate;
            subtitle = (
              <span>{locale === "en" ? "Period: " : "Zeitraum: "}<span className="font-medium" style={{ color: "#4A4640" }}>{period}</span></span>
            );
          } else if (inv.type === "credit_note") {
            title = (
              <span className="font-semibold" style={{ color: "#1F2420" }}>
                {locale === "en" ? "Credit note" : "Gutschrift"}
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 ring-emerald-700/40 bg-emerald-50" style={{ color: "#3A7E58" }}>
                  {locale === "en" ? "CREDIT" : "GUTSCHRIFT"}
                </span>
              </span>
            );
            subtitle = <span>{issueDate}</span>;
          } else {
            title = <span className="font-semibold" style={{ color: "#1F2420" }}>{locale === "en" ? "Invoice" : "Rechnung"}</span>;
            subtitle = <span>{issueDate}</span>;
          }
          return (
            <div key={inv.id} className="px-6 py-3 flex items-center gap-4 text-sm">
              <div className="flex-1 min-w-0">
                <div>{title}</div>
                <div className="text-xs mt-0.5" style={{ color: "#7A7268" }}>{subtitle}</div>
                <div className="text-xs mt-1" style={{ color: isPaid || isCredit ? "#3A7E58" : "#A77E22" }}>
                  {isCredit ? "\u2212" : ""}€{amount} {inv.currency} · {isCredit ? cnStatus : isPaid ? (locale === "en" ? "Paid" : "Bezahlt") : inv.status}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isCredit && inv.status !== "paid" && inv.status !== "voided" && (
                  <button onClick={() => onCollect(inv.id)} disabled={loading !== null}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold text-white ${loading !== null ? "bg-stone-400 cursor-not-allowed" : "btn-primary"}`}>
                    {loading === `collect-${inv.id}` ? "..." : (locale === "en" ? "Pay now" : "Jetzt zahlen")}
                  </button>
                )}
                <a href={inv.type === "credit_note" ? `/api/billing/credit-notes/${inv.id}/pdf` : `/api/billing/invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer"
                  className="px-3 py-1.5 rounded-md text-xs font-semibold border border-stone-400 bg-white text-stone-900 hover:bg-stone-50">
                  PDF
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type ConfirmCancelProps = {
  locale: Locale;
  periodEnd: string | null;
  scheduledPlanId: PlanId | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function ConfirmCancelModal({ locale, periodEnd, scheduledPlanId, busy, onCancel, onConfirm }: ConfirmCancelProps) {
  const endDate = periodEnd ? new Date(periodEnd).toLocaleDateString(locale === "en" ? "en-GB" : "de-DE", { day: "2-digit", month: "long", year: "numeric" }) : "—";
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-md bg-[#F3EFE2] border border-stone-300 shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-stone-300/70">
          <div className="text-lg font-semibold" style={{ color: "#9F1239" }}>
            {locale === "en" ? "Cancel subscription?" : "Abo wirklich kuendigen?"}
          </div>
        </div>
        <div className="px-6 py-5 text-sm" style={{ color: "#1F2420" }}>
          {locale === "en"
            ? <>Your subscription will remain active until <b>{endDate}</b>. After that, no new sessions will be available — but already purchased extras stay usable within their 12-month window.</>
            : <>Dein Abo laeuft noch bis zum <b>{endDate}</b>. Danach sind keine neuen Sessions ueber dein Inklusiv-Kontingent moeglich — bereits gekaufte Extras bleiben innerhalb ihrer 12-Monats-Frist nutzbar.</>}
        
          {scheduledPlanId && (
            <p className="text-xs mt-2" style={{ color: "#7A4E13" }}>
              {locale === "en"
                ? <>The scheduled change to <b>Syn {scheduledPlanId.charAt(0).toUpperCase()}{scheduledPlanId.slice(1)}</b> will be dropped.</>
                : <>Der geplante Wechsel auf <b>Syn {scheduledPlanId.charAt(0).toUpperCase()}{scheduledPlanId.slice(1)}</b> wird aufgehoben.</>}
            </p>
          )}
        </div>
        <div className="px-6 py-5 flex gap-3 justify-end">
          <button disabled={busy} onClick={onCancel}
            className="px-4 py-2 rounded-md text-sm font-semibold border border-stone-400 bg-white text-stone-900 hover:bg-stone-50 disabled:opacity-60">
            {locale === "en" ? "Keep subscription" : "Abo behalten"}
          </button>
          <button disabled={busy} onClick={onConfirm}
            className={`px-4 py-2 rounded-md text-sm font-semibold text-white ${busy ? "bg-stone-400 cursor-not-allowed" : "bg-rose-700 hover:bg-rose-800"}`}>
            {busy ? (locale === "en" ? "Cancelling..." : "Kuendige...") : (locale === "en" ? "Yes, cancel at end of term" : "Ja, zum Periodenende kuendigen")}
          </button>
        </div>
      </div>
    </div>
  );
}

type ConfirmPlanSwitchProps = {
  locale: Locale;
  preview: PlanSwitchPreview;
  currentPlanId: PlanId | null;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

function ConfirmPlanSwitchModal({ locale, preview, currentPlanId, busy, error, onCancel, onConfirm }: ConfirmPlanSwitchProps) {
  const dateLocale = locale === "en" ? "en-GB" : "de-DE";
  const fmtISO = (iso: string | null) => iso ? new Date(iso).toLocaleDateString(dateLocale, { day: "2-digit", month: "long", year: "numeric" }) : "—";
  const fmtMoney = (cents: number) => fmtEUR(cents / 100, locale, 2);
  const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
  const curName = currentPlanId ? `Syn ${cap(currentPlanId)}` : "—";
  const newName = `Syn ${cap(preview.newPlanId)}`;
  const cycleLbl = preview.newCycle === "yearly"
    ? (locale === "en" ? "annual" : "jaehrlich")
    : (locale === "en" ? "monthly" : "monatlich");
  const headline = preview.direction === "upgrade"
    ? (locale === "en" ? "Confirm upgrade" : "Upgrade bestaetigen")
    : preview.direction === "downgrade"
      ? (locale === "en" ? "Confirm downgrade" : "Downgrade bestaetigen")
      : (locale === "en" ? "Confirm change" : "Wechsel bestaetigen");
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-md bg-[#F3EFE2] border border-stone-300 shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-stone-300/70">
          <div className="text-lg font-semibold" style={{ color: "#1F2420" }}>{headline}</div>
          <div className="text-sm mt-1.5 flex items-center gap-2" style={{ color: "#4A4640" }}>
            <span>{curName}</span>
            <span style={{ color: "#7A7268" }}>→</span>
            <span className="font-semibold">{newName}</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ring-1 ring-stone-300 bg-white" style={{ color: "#7A7268" }}>{cycleLbl}</span>
          </div>
        </div>
        <div className="px-6 py-5 space-y-3 text-sm" style={{ color: "#1F2420" }}>
          {preview.direction === "upgrade" && preview.amountDueCents > 0 && (
            <>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs" style={{ color: "#7A7268" }}>
                  <span>{locale === "en" ? "Subtotal (net)" : "Netto"}</span>
                  <span>€{fmtMoney(preview.subTotalCents)}</span>
                </div>
                <div className="flex justify-between text-xs" style={{ color: "#7A7268" }}>
                  <span>{locale === "en" ? "VAT" : "MwSt."}</span>
                  <span>€{fmtMoney(preview.taxCents)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold pt-1.5 border-t border-stone-300/70" style={{ color: "#1F2420" }}>
                  <span>{locale === "en" ? "Charged today" : "Heute belastet"}</span>
                  <span>€{fmtMoney(preview.amountDueCents)}</span>
                </div>
              </div>
              <div className="text-xs" style={{ color: "#7A7268" }}>
                {locale === "en"
                  ? "Only the difference between your old and new plan for the remaining days of this billing period is charged. From your next renewal, the regular price applies."
                  : "Es wird nur die Differenz zwischen altem und neuem Plan fuer die verbleibenden Tage dieses Abrechnungszeitraums berechnet. Ab der naechsten Verlaengerung gilt der regulaere Preis."}
              </div>
            </>
          )}
          {preview.direction === "upgrade" && preview.amountDueCents === 0 && (
            <div className="text-xs" style={{ color: "#7A7268" }}>
              {locale === "en"
                ? "No additional charge today — your upgrade applies immediately and will be billed at the next renewal."
                : "Heute keine zusaetzliche Belastung — der Upgrade greift sofort und wird zur naechsten Verlaengerung abgerechnet."}
            </div>
          )}
          {preview.direction === "downgrade" && preview.currentSlotsInUse > preview.newIncludedSessions && (
            <div className="rounded-md border border-amber-700/40 bg-amber-50 px-3 py-2 text-xs" style={{ color: "#7A4E13" }}>
              {locale === "en"
                ? <>Heads up: you have already used <b>{preview.currentSlotsInUse}</b> sessions this period. The new plan includes only <b>{preview.newIncludedSessions}</b>/month. Once the downgrade takes effect, you will need to buy extras for any additional sessions.</>
                : <>Hinweis: du hast diesen Zeitraum bereits <b>{preview.currentSlotsInUse}</b> Sessions verwendet. Der neue Plan enthaelt nur <b>{preview.newIncludedSessions}</b>/Monat. Ab Greifen des Downgrades brauchst du Extras fuer weitere Sessions.</>}
            </div>
          )}
          {preview.direction === "downgrade" && (
            <>
              <div className="flex justify-between">
                <span>{locale === "en" ? "Effective from" : "Wirksam ab"}</span>
                <span className="font-semibold">{fmtISO(preview.effectiveAt ?? preview.currentTermEnd)}</span>
              </div>
              <div className="text-xs" style={{ color: "#7A7268" }}>
                {locale === "en"
                  ? "Your current plan stays active until then. No charge today and no refund. From the next billing period, the new plan applies."
                  : "Dein aktueller Plan bleibt bis dahin aktiv. Heute keine Belastung und keine Erstattung. Ab der naechsten Abrechnungsperiode gilt der neue Plan."}
              </div>
            </>
          )}
        </div>
        {error && (
          <div className="px-6 pb-3 text-xs" style={{ color: "#9F1239" }}>{error}</div>
        )}
        <div className="px-6 py-5 flex gap-3 justify-end border-t border-stone-300/70">
          <button disabled={busy} onClick={onCancel}
            className="px-4 py-2 rounded-md text-sm font-semibold border border-stone-400 bg-white text-stone-900 hover:bg-stone-50 disabled:opacity-60">
            {locale === "en" ? "Cancel" : "Abbrechen"}
          </button>
          <button disabled={busy} onClick={onConfirm}
            className={`px-4 py-2 rounded-md text-sm font-semibold text-white ${busy ? "bg-stone-400 cursor-not-allowed" : "btn-primary"}`}>
            {busy
              ? (locale === "en" ? "Processing..." : "Verarbeite...")
              : preview.direction === "upgrade" && preview.amountDueCents > 0
                ? (locale === "en" ? `Pay €${fmtMoney(preview.amountDueCents)} & upgrade` : `Jetzt zahlungspflichtig — €${fmtMoney(preview.amountDueCents)}`)
                : (locale === "en" ? "Confirm" : "Bestaetigen")}
          </button>
        </div>
      </div>
    </div>
  );
}

type ConfirmPauseProps = {
  locale: Locale;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (months: number) => void;
};

function ConfirmPauseModal({ locale, busy, onCancel, onConfirm }: ConfirmPauseProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-md bg-[#F3EFE2] border border-stone-300 shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-stone-300/70">
          <div className="text-lg font-semibold" style={{ color: "#1F2420" }}>
            {locale === "en" ? "Pause subscription" : "Abo pausieren"}
          </div>
          <div className="text-sm mt-1" style={{ color: "#7A7268" }}>
            {locale === "en"
              ? "Pick how long to pause. Pause starts at the end of your current billing period (so you use up the month you already paid). Your plan resumes automatically."
              : "Wie lange willst du pausieren? Die Pause greift zum Ende deines aktuellen Abrechnungszeitraums (so verbrauchst du den bereits bezahlten Monat). Danach setzt sich das Abo automatisch fort."}
          </div>
        </div>
        <div className="px-6 py-5 grid grid-cols-3 gap-3">
          {[1, 2, 3].map(m => (
            <button key={m} disabled={busy} onClick={() => onConfirm(m)}
              className={`rounded-md border border-stone-400 bg-white px-3 py-4 text-center hover:border-rose-700 hover:bg-rose-50/30 disabled:opacity-60 ${busy ? "cursor-not-allowed" : "cursor-pointer"}`}>
              <div className="text-2xl font-semibold" style={{ color: "#1F2420" }}>{m}</div>
              <div className="text-xs mt-0.5" style={{ color: "#7A7268" }}>
                {locale === "en" ? (m === 1 ? "month" : "months") : (m === 1 ? "Monat" : "Monate")}
              </div>
            </button>
          ))}
        </div>
        <div className="px-6 py-4 flex justify-end border-t border-stone-300/70">
          <button disabled={busy} onClick={onCancel}
            className="px-4 py-2 rounded-md text-sm font-semibold border border-stone-400 bg-white text-stone-900 hover:bg-stone-50 disabled:opacity-60">
            {locale === "en" ? "Cancel" : "Abbrechen"}
          </button>
        </div>
      </div>
    </div>
  );
}

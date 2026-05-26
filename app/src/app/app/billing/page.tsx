import { requireUser } from "@/lib/current-user";
import { getLocaleFromCookies, type Locale } from "@/lib/i18n";
import { db } from "@/lib/db";
import { subscriptions, purchasedExtras } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { isBillingConfigured, PLANS, fetchLatestSubscriptionForCustomer, type PlanId } from "@/lib/chargebee";
import { loadQuotaState } from "@/lib/quota";
import BillingActions from "./BillingActions";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null | undefined, locale: Locale): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(locale === "en" ? "en-GB" : "de-DE", {
    year: "numeric", month: "long", day: "numeric"
  });
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const justActivated = sp?.status === "success";
  const u = await requireUser();

  if (justActivated) {
    const [existing] = await db.select().from(subscriptions).where(eq(subscriptions.userId, u.id)).limit(1);
    if (existing?.chargebeeCustomerId) {
      const cbSub = await fetchLatestSubscriptionForCustomer(existing.chargebeeCustomerId);
      if (cbSub) {
        const newPriceId = cbSub.subscription_items?.[0]?.item_price_id ?? null;
        await db.update(subscriptions).set({
          chargebeeSubscriptionId: cbSub.id,
          status: cbSub.status,
          planItemPriceId: newPriceId,
          currentTermStart: cbSub.current_term_start ? new Date(cbSub.current_term_start * 1000) : null,
          currentTermEnd: cbSub.current_term_end ? new Date(cbSub.current_term_end * 1000) : null,
          trialEnd: cbSub.trial_end ? new Date(cbSub.trial_end * 1000) : null,
          updatedAt: new Date()
        }).where(eq(subscriptions.id, existing.id));
      }
    }
  }
  const locale = await getLocaleFromCookies();
  const configured = isBillingConfigured();
  const [sub] = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, u.id)).limit(1);

  const hasActiveSub = sub && ["active","in_trial","non_renewing"].includes(sub.status);
  // For UI routing: paused/unpaid subs also get the PlanSwitcher (not the Plan-Picker)
  const hasManageableSub = sub && ["active","in_trial","non_renewing","paused","unpaid"].includes(sub.status);
  const pid = sub?.planItemPriceId;
  const planKey: PlanId | null =
    pid === PLANS.basic.priceId      || pid === PLANS.basic.yearlyPriceId      ? "basic"      :
    pid === PLANS.pro.priceId        || pid === PLANS.pro.yearlyPriceId        ? "pro"        :
    pid === PLANS.enterprise.priceId || pid === PLANS.enterprise.yearlyPriceId ? "enterprise" : null;
  const planCycle: "monthly" | "yearly" | null =
    pid === PLANS.basic.yearlyPriceId || pid === PLANS.pro.yearlyPriceId || pid === PLANS.enterprise.yearlyPriceId ? "yearly" :
    planKey ? "monthly" : null;
  const spid = sub?.scheduledPlanItemPriceId;
  const scheduledPlan: PlanId | null =
    spid === PLANS.basic.priceId      || spid === PLANS.basic.yearlyPriceId      ? "basic"      :
    spid === PLANS.pro.priceId        || spid === PLANS.pro.yearlyPriceId        ? "pro"        :
    spid === PLANS.enterprise.priceId || spid === PLANS.enterprise.yearlyPriceId ? "enterprise" : null;
  const scheduledCycle: "monthly" | "yearly" | null =
    spid === PLANS.basic.yearlyPriceId || spid === PLANS.pro.yearlyPriceId || spid === PLANS.enterprise.yearlyPriceId ? "yearly" :
    scheduledPlan ? "monthly" : null;
  const quota = await loadQuotaState(u.id);
  const extrasHistory = await db.select().from(purchasedExtras)
    .where(eq(purchasedExtras.userId, u.id))
    .orderBy(desc(purchasedExtras.createdAt));

  return (
    <div className="flex-1 w-full max-w-[760px] mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight" style={{ color: "#1F2420" }}>
          {locale === "en" ? "Billing & Subscription" : "Abo & Rechnungen"}
        </h1>
        <p className="text-sm mt-1.5" style={{ color: "#7A7268" }}>
          {locale === "en"
            ? "Manage your Syn subscription, payment method and invoices."
            : "Verwalte dein Syn-Abo, Zahlungsmethode und Rechnungen."}
        </p>
      </div>

      {!configured && (
        <div className="rounded-md border border-amber-700/40 bg-amber-50 px-5 py-4 mb-6 text-sm" style={{ color: "#7A4E13" }}>
          {locale === "en"
            ? "Billing is not configured yet. Contact the administrator."
            : "Abrechnung ist noch nicht konfiguriert. Bitte den Administrator kontaktieren."}
        </div>
      )}

      <BillingActions
        locale={locale}
        hasActiveSub={!!hasManageableSub}
        justActivated={justActivated}
        configured={configured}
        quota={{
          totalQuota: quota.totalQuota,
          slotsInUse: quota.slotsInUse,
          remaining: quota.remaining,
          consumed: quota.consumed,
          drafts: quota.drafts,
          purchasedExtras: quota.extrasAvailable,
          bypass: quota.bypass,
          planId: quota.planId,
          cycle: planCycle,
          periodEnd: quota.periodEnd ? quota.periodEnd.toISOString() : null,
          scheduledPlanId: scheduledPlan,
          scheduledCycle: scheduledCycle,
          scheduledChangeAt: sub?.scheduledChangeAt ? sub.scheduledChangeAt.toISOString() : null,
          pauseDate: sub?.pauseDate ? sub.pauseDate.toISOString() : null,
          resumeDate: sub?.resumeDate ? sub.resumeDate.toISOString() : null,
          status: sub?.status ?? null
        }}
        extrasHistory={extrasHistory.map(e => ({
          id: e.id,
          createdAt: e.createdAt.toISOString(),
          expiresAt: e.expiresAt ? e.expiresAt.toISOString() : null,
          quantity: e.quantity,
          quantityUsed: e.quantityUsed,
          unitPriceEur: e.unitPriceEur
        }))}
      />
    </div>
  );
}

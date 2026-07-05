import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/current-user";
import { chargebee, PLANS, isPlanId, isBillingConfigured } from "@/lib/chargebee";
import { loadQuotaState } from "@/lib/quota";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isBillingConfigured() || !chargebee) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }

  const body = await req.json().catch(() => ({}));
  const plan = body?.plan;
  const cycle = body?.cycle === "yearly" ? "yearly" : "monthly";
  if (!isPlanId(plan)) {
    return NextResponse.json({ error: "invalid plan" }, { status: 400 });
  }

  const [sub] = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, user.id)).limit(1);
  if (!sub?.chargebeeSubscriptionId) {
    return NextResponse.json({ error: "no subscription" }, { status: 402 });
  }
  const state = await loadQuotaState(user.id);

  const meta = PLANS[plan];
  const newPriceId = cycle === "yearly" ? meta.yearlyPriceId : meta.priceId;

  const currentMeta =
    sub.planItemPriceId === PLANS.basic.priceId || sub.planItemPriceId === PLANS.basic.yearlyPriceId ? PLANS.basic :
    sub.planItemPriceId === PLANS.pro.priceId || sub.planItemPriceId === PLANS.pro.yearlyPriceId ? PLANS.pro :
    sub.planItemPriceId === PLANS.enterprise.priceId || sub.planItemPriceId === PLANS.enterprise.yearlyPriceId ? PLANS.enterprise : null;
  const isUpgrade = currentMeta ? meta.basePriceEur > currentMeta.basePriceEur : true;
  const sameTier = currentMeta && meta.basePriceEur === currentMeta.basePriceEur;
  const direction: "upgrade" | "downgrade" | "same" =
    !currentMeta ? "upgrade" :
    sameTier ? (cycle === "yearly" ? "upgrade" : "downgrade") : isUpgrade ? "upgrade" : "downgrade";

  try {
    const endOfTerm = direction === "downgrade";
    type EstInvoice = { amount_due?: number; amount_paid?: number; total?: number; sub_total?: number; tax?: number; credits_applied?: number; currency_code?: string };
    const estimate = await chargebee.estimate.updateSubscriptionForItems({
      subscription: { id: sub.chargebeeSubscriptionId },
      subscription_items: [{ item_price_id: newPriceId, quantity: 1 }],
      end_of_term: endOfTerm,
      prorate: !endOfTerm
    } as unknown as Record<string, unknown>) as unknown as {
      estimate?: {
        invoice_estimate?: EstInvoice;
        next_invoice_estimate?: EstInvoice;
        subscription_estimate?: { current_term_end?: number; next_billing_at?: number };
      }
    };

    const est = estimate?.estimate ?? {};
    const inv = est.invoice_estimate ?? est.next_invoice_estimate ?? {};
    const amountDueCents = inv.amount_due ?? inv.total ?? 0;
    const totalCents = inv.total ?? amountDueCents;
    const subTotalCents = inv.sub_total ?? Math.round(totalCents / 1.19);
    // MwSt. gehoert zum Charge-Teil (total = netto + tax); Gutschrift separat
    const taxCents = inv.tax ?? (totalCents - subTotalCents);
    const creditsAppliedCents = inv.credits_applied ?? Math.max(0, totalCents - amountDueCents);
    const currency = inv.currency_code ?? "EUR";
    const effectiveAt = endOfTerm
      ? (sub.currentTermEnd ? sub.currentTermEnd.toISOString() : null)
      : null;

    return NextResponse.json({
      direction,
      currentBasePriceEur: currentMeta?.basePriceEur ?? null,
      newPlanId: plan,
      newCycle: cycle,
      newBasePriceEur: meta.basePriceEur,
      newYearlyPriceEur: meta.yearlyPriceEur,
      amountDueCents,
      subTotalCents,
      taxCents,
      creditsAppliedCents,
      currency,
      effectiveAt,
      endOfTerm,
      currentTermEnd: sub.currentTermEnd ? sub.currentTermEnd.toISOString() : null,
      newIncludedSessions: meta.includedSessions,
      currentSlotsInUse: state.slotsInUse,
      currentBaseUsed: state.baseUsed
    });
  } catch (e) {
    console.error("[change-plan/preview] failed:", e);
    return NextResponse.json({ error: "estimate failed" }, { status: 502 });
  }
}

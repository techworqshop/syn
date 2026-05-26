import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/current-user";
import { chargebee, PLANS, isPlanId, isBillingConfigured } from "@/lib/chargebee";

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
  const confirmedDirection = body?.confirmedDirection;
  if (!isPlanId(plan)) {
    return NextResponse.json({ error: "invalid plan" }, { status: 400 });
  }

  const [sub] = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, user.id)).limit(1);
  if (!sub?.chargebeeSubscriptionId) {
    return NextResponse.json({ error: "no subscription" }, { status: 402 });
  }
  const meta = PLANS[plan];
  const newPriceId = cycle === "yearly" ? meta.yearlyPriceId : meta.priceId;

  if (sub.planItemPriceId === newPriceId) {
    return NextResponse.json({ error: "same plan" }, { status: 400 });
  }
  if (sub.status === "paused" || sub.status === "unpaid") {
    return NextResponse.json({ error: "subscription not in switchable state — please update payment method first" }, { status: 409 });
  }

  const currentMeta =
    sub.planItemPriceId === PLANS.basic.priceId || sub.planItemPriceId === PLANS.basic.yearlyPriceId ? PLANS.basic :
    sub.planItemPriceId === PLANS.pro.priceId || sub.planItemPriceId === PLANS.pro.yearlyPriceId ? PLANS.pro :
    sub.planItemPriceId === PLANS.enterprise.priceId || sub.planItemPriceId === PLANS.enterprise.yearlyPriceId ? PLANS.enterprise : null;
  const isUpgrade = currentMeta ? meta.basePriceEur > currentMeta.basePriceEur : true;
  const sameTier = currentMeta && meta.basePriceEur === currentMeta.basePriceEur;
  const direction = !currentMeta ? "upgrade" :
    sameTier ? (cycle === "yearly" ? "upgrade" : "downgrade") : isUpgrade ? "upgrade" : "downgrade";

  if (confirmedDirection && confirmedDirection !== direction) {
    return NextResponse.json({ error: "direction mismatch — please reload" }, { status: 409 });
  }
  const endOfTerm = direction === "downgrade";

  // If the sub was scheduled to cancel, plan-switch implicitly reactivates it.
  if (sub.status === "non_renewing") {
    try {
      await chargebee.subscription.removeScheduledCancellation(sub.chargebeeSubscriptionId);
    } catch (e) {
      console.warn("[change-plan] removeScheduledCancellation failed (continuing):", e);
    }
  }

  try {
    await chargebee.subscription.updateForItems(sub.chargebeeSubscriptionId, {
      subscription_items: [{ item_price_id: newPriceId, quantity: 1 }],
      end_of_term: endOfTerm,
      prorate: !endOfTerm,
      replace_items_list: true,
      invoice_immediately: !endOfTerm
    } as unknown as Record<string, unknown>);
  } catch (e) {
    console.error("[change-plan] failed:", e);
    return NextResponse.json({ error: "switch failed" }, { status: 502 });
  }

  if (endOfTerm) {
    await db.update(subscriptions)
      .set({ scheduledPlanItemPriceId: newPriceId, scheduledChangeAt: sub.currentTermEnd, updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id));
  } else {
    await db.update(subscriptions)
      .set({ planItemPriceId: newPriceId, scheduledPlanItemPriceId: null, scheduledChangeAt: null, updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id));
  }

  return NextResponse.json({
    ok: true,
    plan,
    cycle,
    direction,
    applied: endOfTerm ? "end_of_term" : "immediate",
    effectiveAt: endOfTerm && sub.currentTermEnd ? sub.currentTermEnd.toISOString() : null
  });
}

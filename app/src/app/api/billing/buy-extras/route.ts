import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions, purchasedExtras } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/current-user";
import { getLocaleFromCookies } from "@/lib/i18n";
import { chargebee, PLANS, isPlanId, isBillingConfigured } from "@/lib/chargebee";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PACKAGES: Record<number, true> = { 1: true, 5: true, 10: true };

export async function POST(req: Request) {
  if (!isBillingConfigured() || !chargebee) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }

  const body = await req.json().catch(() => ({}));
  const quantity = Number(body?.quantity ?? 0);
  if (!PACKAGES[quantity]) {
    return NextResponse.json({ error: "invalid quantity" }, { status: 400 });
  }

  const [sub] = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, user.id)).limit(1);
  if (!sub || !sub.chargebeeSubscriptionId || !sub.planItemPriceId || !sub.currentTermStart) {
    return NextResponse.json({ error: "no active subscription" }, { status: 402 });
  }
  // Determine plan + per-unit price from current subscription
  const planId =
    sub.planItemPriceId === PLANS.basic.priceId ? "basic" :
    sub.planItemPriceId === PLANS.pro.priceId ? "pro" :
    sub.planItemPriceId === PLANS.enterprise.priceId ? "enterprise" : null;
  if (!isPlanId(planId)) {
    return NextResponse.json({ error: "unknown plan" }, { status: 500 });
  }
  const meta = PLANS[planId];
  const unitPriceCents = meta.overagePerSessionEur * 100;
  const amount = unitPriceCents * quantity;

  let invoiceId: string | undefined;
  let chargeId: string | undefined;
  try {
    const result = await chargebee.invoice.charge({
      subscription_id: sub.chargebeeSubscriptionId,
      amount,
      description: `${quantity} extra session${quantity === 1 ? "" : "s"} (${planId})`
    });
    const inv = (result as { invoice?: { id?: string; line_items?: Array<{ id?: string }> } }).invoice;
    invoiceId = inv?.id;
    chargeId = inv?.line_items?.[0]?.id;
  } catch (e) {
    console.error("[buy-extras] charge failed:", e);
    const cbE = e as { type?: string; api_error_code?: string };
    if (cbE?.type === "payment" || cbE?.api_error_code === "payment_processing_failed") {
      const locale = await getLocaleFromCookies();
      return NextResponse.json({ error: locale === "en"
        ? "Your bank declined the charge. Check the card or use a different one."
        : "Deine Bank hat die Zahlung abgelehnt. Pruefe die Karte oder nutze eine andere." }, { status: 402 });
    }
    return NextResponse.json({ error: "charge failed" }, { status: 502 });
  }

  // Persist the purchased extras locally so quota lookups see them immediately
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  await db.insert(purchasedExtras).values({
    userId: user.id,
    periodStart: sub.currentTermStart,
    quantity,
    quantityUsed: 0,
    expiresAt,
    unitPriceEur: meta.overagePerSessionEur,
    chargebeeInvoiceId: invoiceId,
    chargebeeChargeId: chargeId
  });

  return NextResponse.json({ ok: true, quantity, unitPriceEur: meta.overagePerSessionEur });
}

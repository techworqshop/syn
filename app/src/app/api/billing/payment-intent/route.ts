import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/current-user";
import { chargebee, isBillingConfigured } from "@/lib/chargebee";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Zero-amount Payment Intent fuer Karten-Verifikation (3DS/SCA-Pflicht bei Live-Stripe).
export async function POST() {
  if (!isBillingConfigured() || !chargebee) {
    return NextResponse.json({ error: "billing not configured" }, { status: 503 });
  }
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }
  const [sub] = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, user.id)).limit(1);
  if (!sub?.chargebeeCustomerId) {
    return NextResponse.json({ error: "no customer" }, { status: 404 });
  }
  try {
    const result = await chargebee.paymentIntent.create({
      amount: 0,
      currency_code: "EUR",
      customer_id: sub.chargebeeCustomerId
    });
    const intent = (result as { payment_intent?: unknown }).payment_intent;
    if (!intent) return NextResponse.json({ error: "no intent" }, { status: 502 });
    return NextResponse.json({ intent });
  } catch (e) {
    console.error("[payment-intent] failed:", e);
    return NextResponse.json({ error: "intent create failed" }, { status: 502 });
  }
}

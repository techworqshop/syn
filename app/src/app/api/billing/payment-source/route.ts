import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/current-user";
import { chargebee, isBillingConfigured } from "@/lib/chargebee";

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
  const paymentIntentId = typeof body?.paymentIntentId === "string" ? body.paymentIntentId : null;
  const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "";
  if (!paymentIntentId) return NextResponse.json({ error: "paymentIntentId required" }, { status: 400 });

  const [sub] = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, user.id)).limit(1);
  if (!sub?.chargebeeCustomerId) {
    return NextResponse.json({ error: "no customer" }, { status: 404 });
  }
  try {
    // Intent wurde client-seitig via 3DS autorisiert (authorizeWith3ds)
    await chargebee.paymentSource.createUsingPaymentIntent({
      customer_id: sub.chargebeeCustomerId,
      payment_intent: { id: paymentIntentId }
    });

    // Update customer first/last name when provided (cardholder identity)
    if (firstName || lastName) {
      try {
        await chargebee.customer.update(sub.chargebeeCustomerId, {
          ...(firstName ? { first_name: firstName } : {}),
          ...(lastName ? { last_name: lastName } : {})
        } as unknown as Record<string, unknown>);
      } catch (e) {
        console.warn("[payment-source] customer name update failed:", e);
      }
    }
  } catch (e) {
    console.error("[payment-source] failed:", e);
    return NextResponse.json({ error: "payment source create failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

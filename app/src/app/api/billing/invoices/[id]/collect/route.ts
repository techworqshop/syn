import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/current-user";
import { chargebee, isBillingConfigured } from "@/lib/chargebee";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isBillingConfigured() || !chargebee) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }

  const { id: invoiceId } = await ctx.params;
  if (!invoiceId) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const [sub] = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, user.id)).limit(1);
  if (!sub?.chargebeeCustomerId) {
    return NextResponse.json({ error: "no customer" }, { status: 404 });
  }

  try {
    type CbInv = { id: string; customer_id: string };
    const got = await chargebee.invoice.retrieve(invoiceId) as unknown as { invoice?: CbInv };
    if (got.invoice?.customer_id !== sub.chargebeeCustomerId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    await chargebee.invoice.collectPayment(invoiceId, {} as unknown as Record<string, unknown>);
  } catch (e) {
    console.error("[invoices/collect] failed:", e);
    const msg = e instanceof Error ? e.message : "collect failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

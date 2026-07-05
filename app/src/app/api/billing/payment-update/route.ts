import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/current-user";
import { chargebee, isBillingConfigured } from "@/lib/chargebee";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  if (!isBillingConfigured() || !chargebee) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }

  const [sub] = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, user.id)).limit(1);
  if (!sub?.chargebeeCustomerId) {
    return NextResponse.json({ error: "no subscription" }, { status: 404 });
  }
  const PUBLIC_BASE = process.env.PUBLIC_BASE_URL || "https://syn.worqshop.io";

  try {
    const result = await chargebee.hostedPage.updatePaymentMethod({
      customer: { id: sub.chargebeeCustomerId },
      redirect_url: `${PUBLIC_BASE}/app/billing?status=card_updated`
    } as unknown as Record<string, unknown>);
    const url = (result as { hosted_page?: { url?: string } }).hosted_page?.url;
    if (!url) return NextResponse.json({ error: "no url" }, { status: 502 });
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[payment-update] failed:", e);
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}

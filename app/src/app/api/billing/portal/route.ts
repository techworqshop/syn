import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { createPortalSession, isBillingConfigured } from "@/lib/chargebee";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  if (!isBillingConfigured()) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }

  const [sub] = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, user.id)).limit(1);
  if (!sub) {
    return NextResponse.json({ error: "no subscription" }, { status: 404 });
  }
  const PUBLIC_BASE = process.env.PUBLIC_BASE_URL || "https://syn.worqshop.io";
  try {
    const url = await createPortalSession({
      customerId: sub.chargebeeCustomerId,
      redirectUrl: `${PUBLIC_BASE}/app/billing`
    });
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[billing/portal] failed:", e);
    return NextResponse.json({ error: "portal failed" }, { status: 500 });
  }
}

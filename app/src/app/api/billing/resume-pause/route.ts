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
  if (!sub?.chargebeeSubscriptionId) {
    return NextResponse.json({ error: "no subscription" }, { status: 404 });
  }

  const pendingPause = sub.status === "active"
    && sub.pauseDate
    && sub.pauseDate.getTime() > Date.now();

  try {
    if (pendingPause) {
      await chargebee.subscription.removeScheduledPause(sub.chargebeeSubscriptionId);
    } else if (sub.status === "paused") {
      await chargebee.subscription.resume(sub.chargebeeSubscriptionId, {
        resume_option: "immediately"
      } as unknown as Record<string, unknown>);
    } else {
      return NextResponse.json({ error: "no pause to resume" }, { status: 409 });
    }
  } catch (e) {
    console.error("[billing/resume-pause] failed:", e);
    return NextResponse.json({ error: "resume failed" }, { status: 502 });
  }

  await db.update(subscriptions).set({
    status: pendingPause ? sub.status : "active",
    pauseDate: null,
    resumeDate: null,
    updatedAt: new Date()
  }).where(eq(subscriptions.id, sub.id));

  return NextResponse.json({ ok: true });
}

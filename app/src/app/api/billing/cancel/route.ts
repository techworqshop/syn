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
  const subId = sub.chargebeeSubscriptionId;

  // Clear scheduled downgrade so it doesn't apply right before cancel
  if (sub.scheduledPlanItemPriceId) {
    try {
      await chargebee.subscription.removeScheduledChanges(subId);
    } catch (e) {
      console.warn("[billing/cancel] removeScheduledChanges failed (continuing):", e);
    }
  }

  // Pending pause (status=active, pause queued for term-end): drop the
  // scheduled pause, then fall through to the normal end_of_term cancel.
  const pendingPause = sub.status === "active"
    && !!sub.pauseDate && sub.pauseDate.getTime() > Date.now();
  if (pendingPause) {
    try {
      await chargebee.subscription.removeScheduledPause(subId);
    } catch (e) {
      console.warn("[billing/cancel] removeScheduledPause failed (continuing):", e);
    }
  }

  // Paused live (status=paused): no active term, end_of_term doesn't apply.
  // Resume immediately then cancel — gives the user a clean exit instead
  // of leaving the sub stuck in "paused-and-also-cancelled" limbo.
  if (sub.status === "paused") {
    try {
      await chargebee.subscription.resume(subId, {
        resume_option: "immediately"
      } as unknown as Record<string, unknown>);
    } catch (e) {
      console.error("[billing/cancel] resume-before-cancel failed:", e);
      return NextResponse.json({ error: "cancel failed (could not resume paused sub)" }, { status: 502 });
    }
  }

  try {
    await chargebee.subscription.cancelForItems(subId, {
      end_of_term: true
    } as unknown as Record<string, unknown>);
  } catch (e) {
    console.error("[billing/cancel] failed:", e);
    return NextResponse.json({ error: "cancel failed" }, { status: 502 });
  }

  await db.update(subscriptions)
    .set({
      status: "non_renewing",
      scheduledPlanItemPriceId: null,
      scheduledChangeAt: null,
      pauseDate: null,
      resumeDate: null,
      updatedAt: new Date()
    })
    .where(eq(subscriptions.id, sub.id));

  return NextResponse.json({ ok: true, endsAt: sub.currentTermEnd?.toISOString() ?? null });
}

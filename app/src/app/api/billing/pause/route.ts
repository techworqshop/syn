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
  const months = Number(body?.months) || 1;
  if (months < 1 || months > 12) {
    return NextResponse.json({ error: "months must be 1..12" }, { status: 400 });
  }

  const [sub] = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, user.id)).limit(1);
  if (!sub?.chargebeeSubscriptionId) {
    return NextResponse.json({ error: "no subscription" }, { status: 404 });
  }
  if (sub.status !== "active") {
    return NextResponse.json({ error: "subscription not active" }, { status: 409 });
  }

  // Pause kicks in at end of current billing term (user already paid for it).
  const termEnd = sub.currentTermEnd ? Math.floor(sub.currentTermEnd.getTime() / 1000) : Math.floor(Date.now() / 1000);
  const resumeAt = termEnd + months * 30 * 24 * 60 * 60;

  try {
    await chargebee.subscription.pause(sub.chargebeeSubscriptionId, {
      pause_option: "end_of_term",
      resume_date: resumeAt
    } as unknown as Record<string, unknown>);
  } catch (e) {
    console.error("[billing/pause] failed:", e);
    const err = e as { error_code?: string; message?: string };
    if (err?.error_code === "pause_feature_not_enabled") {
      return NextResponse.json({ error: "Pause-Feature ist im Chargebee-Backend noch nicht freigeschaltet." }, { status: 503 });
    }
    return NextResponse.json({ error: err?.message ?? "pause failed" }, { status: 502 });
  }

  await db.update(subscriptions).set({
    pauseDate: new Date(termEnd * 1000),
    resumeDate: new Date(resumeAt * 1000),
    updatedAt: new Date()
  }).where(eq(subscriptions.id, sub.id));

  return NextResponse.json({
    ok: true,
    pausesAt: new Date(termEnd * 1000).toISOString(),
    resumesAt: new Date(resumeAt * 1000).toISOString()
  });
}

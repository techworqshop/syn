import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/db/schema";
import { chargebee } from "@/lib/chargebee";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function auth(req: Request): boolean {
  const sec = process.env.CRON_SECRET;
  if (!sec) return false;
  const h = req.headers.get("authorization") || "";
  return h === `Bearer ${sec}`;
}

export async function POST(req: Request) {
  if (!auth(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!chargebee) return NextResponse.json({ error: "billing not configured" }, { status: 503 });

  const subs = await db.select().from(subscriptions);
  let updated = 0, skipped = 0, errors = 0;

  for (const row of subs) {
    if (!row.chargebeeSubscriptionId) { skipped++; continue; }
    try {
      const r = await chargebee.subscription.retrieve(row.chargebeeSubscriptionId);
      const s = (r as { subscription?: { status?: string; current_term_start?: number; current_term_end?: number; cancelled_at?: number } }).subscription;
      if (!s) { skipped++; continue; }
      const u = (t?: number) => t ? new Date(t * 1000) : null;
      await db.update(subscriptions).set({
        status: s.status ?? row.status,
        currentTermStart: u(s.current_term_start) ?? row.currentTermStart,
        currentTermEnd: u(s.current_term_end) ?? row.currentTermEnd,
        cancelledAt: u(s.cancelled_at) ?? row.cancelledAt,
        updatedAt: new Date()
      }).where(eq(subscriptions.id, row.id));
      updated++;
    } catch (e) {
      console.warn("[reconcile-subs] failed for", row.id, e);
      errors++;
    }
  }
  return NextResponse.json({ ok: true, updated, skipped, errors, total: subs.length });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/current-user";
import { chargebee, isBillingConfigured } from "@/lib/chargebee";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isBillingConfigured() || !chargebee) {
    return NextResponse.json({ error: "billing not configured" }, { status: 503 });
  }
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }
  const { id } = await params;
  const [sub] = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, user.id)).limit(1);
  if (!sub?.chargebeeCustomerId) return NextResponse.json({ error: "no customer" }, { status: 404 });
  try {
    const own = await chargebee.creditNote.retrieve(id);
    const cust = (own as { credit_note?: { customer_id?: string } }).credit_note?.customer_id;
    if (cust !== sub.chargebeeCustomerId) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const result = await chargebee.creditNote.pdf(id, { disposition_type: "attachment" } as unknown as Record<string, unknown>);
    const url = (result as { download?: { download_url?: string } }).download?.download_url;
    if (!url) return NextResponse.json({ error: "no url" }, { status: 502 });
    return NextResponse.redirect(url, 302);
  } catch (e) {
    console.error("[credit-note/pdf] failed:", e);
    return NextResponse.json({ error: "pdf failed" }, { status: 502 });
  }
}

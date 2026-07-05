import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions, billingEvents, purchasedExtras, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PLANS, chargebee } from "@/lib/chargebee";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WH_USER = process.env.CHARGEBEE_WEBHOOK_USER || "";
const WH_PASS = process.env.CHARGEBEE_WEBHOOK_PASS || "";

function basicAuthOk(req: Request): boolean {
  if (!WH_USER || !WH_PASS) return false;
  const h = req.headers.get("authorization") || "";
  if (!h.toLowerCase().startsWith("basic ")) return false;
  const token = h.slice(6).trim();
  try {
    const dec = Buffer.from(token, "base64").toString("utf-8");
    const idx = dec.indexOf(":");
    if (idx < 0) return false;
    return dec.slice(0, idx) === WH_USER && dec.slice(idx + 1) === WH_PASS;
  } catch { return false; }
}

type ChargebeeSubscription = {
  id: string;
  status: string;
  customer_id: string;
  current_term_start?: number;
  current_term_end?: number;
  trial_end?: number;
  cancelled_at?: number;
  pause_date?: number;
  resume_date?: number;
  subscription_items?: Array<{ item_price_id: string; item_type?: string; quantity?: number }>;
  has_scheduled_changes?: boolean;
};

type ChargebeeCustomer = {
  id: string;
};

type ChargebeeInvoiceLineItem = {
  id?: string;
  description?: string;
  amount?: number;
  unit_amount?: number;
  subscription_id?: string;
};

type ChargebeeInvoice = {
  id: string;
  customer_id?: string;
  subscription_id?: string;
  amount_paid?: number;
  line_items?: ChargebeeInvoiceLineItem[];
};

type ChargebeeEvent = {
  id: string;
  event_type: string;
  occurred_at?: number;
  content: {
    subscription?: ChargebeeSubscription;
    customer?: ChargebeeCustomer;
    invoice?: ChargebeeInvoice;
  };
};

function unix(ts?: number): Date | null {
  return typeof ts === "number" ? new Date(ts * 1000) : null;
}

function planFromItems(items?: ChargebeeSubscription["subscription_items"]): string | null {
  if (!items?.length) return null;
  const plan = items.find(i => (i.item_type ?? "plan") === "plan");
  return plan?.item_price_id ?? items[0].item_price_id ?? null;
}

async function applySubscriptionEvent(ev: ChargebeeEvent): Promise<void> {
  const payloadSub = ev.content.subscription;
  if (!payloadSub) return;
  // Defense: re-fetch from Chargebee API rather than trusting webhook payload
  let sub: ChargebeeSubscription = payloadSub;
  if (chargebee && payloadSub.id) {
    try {
      const fresh = await chargebee.subscription.retrieve(payloadSub.id);
      const f = (fresh as { subscription?: ChargebeeSubscription }).subscription;
      if (f) sub = f;
    } catch (e) {
      console.warn("[webhook] re-fetch failed, falling back:", e);
    }
  }
  const userId = sub.customer_id;
  // Env-Guard: Events fuer Customer aus anderer Umgebung (geteilte CB-Site)
  // ueberspringen statt am users-FK zu scheitern (500 -> CB-Retry-Loop).
  const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!owner) {
    console.warn(`[webhook] unknown customer ${userId} - skipping sub event`);
    return;
  }
  const planId = planFromItems(sub.subscription_items);
  const existing = await db.select().from(subscriptions)
    .where(eq(subscriptions.chargebeeCustomerId, sub.customer_id)).limit(1);
  // Clear scheduled-fields when scheduled plan became current
  const prev = existing[0];
  const scheduledMatches = prev?.scheduledPlanItemPriceId && planId === prev.scheduledPlanItemPriceId;
  const payload = {
    userId,
    chargebeeCustomerId: sub.customer_id,
    chargebeeSubscriptionId: sub.id,
    status: sub.status,
    planItemPriceId: planId,
    currentTermStart: unix(sub.current_term_start),
    currentTermEnd: unix(sub.current_term_end),
    trialEnd: unix(sub.trial_end),
    cancelledAt: unix(sub.cancelled_at),
    pauseDate: unix(sub.pause_date),
    resumeDate: unix(sub.resume_date),
    ...(scheduledMatches || sub.has_scheduled_changes === false ? { scheduledPlanItemPriceId: null, scheduledChangeAt: null } : {}),
    updatedAt: new Date()
  };
  if (existing.length === 0) {
    await db.insert(subscriptions).values(payload).onConflictDoNothing();
  } else {
    await db.update(subscriptions)
      .set(payload)
      .where(eq(subscriptions.chargebeeCustomerId, sub.customer_id));
  }
}

export async function POST(req: Request) {
  if (!basicAuthOk(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: ChargebeeEvent;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body?.id || !body?.event_type) {
    return NextResponse.json({ error: "malformed event" }, { status: 400 });
  }

  // Idempotency: insert into billing_events; if event_id already exists, return 200 fast
  const userIdGuess = body.content?.subscription?.customer_id ?? body.content?.customer?.id ?? null;
  try {
    await db.insert(billingEvents).values({
      eventId: body.id,
      eventType: body.event_type,
      userId: userIdGuess,
      payload: body as unknown as Record<string, unknown>
    });
  } catch (e) {
    // unique violation on event_id -> already processed, ack
    console.warn("[chargebee webhook] event already seen or insert failed:", body.id, (e as Error).message);
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    const t = body.event_type;
    if (t.startsWith("subscription_")) {
      await applySubscriptionEvent(body);
    }
    if (body.content?.invoice && (t === "invoice_generated" || t === "payment_succeeded" || t === "invoice_updated")) {
      await applyExtrasInvoice(body.content.invoice);
    }
  } catch (e) {
    console.error("[chargebee webhook] handler error for", body.event_type, e);
    // we still ACK 200 so Chargebee does not retry-flood; the event is in billing_events for manual replay
  }
  return NextResponse.json({ ok: true });
}

const EXTRA_RE = /^(\d+)\s+extra\s+session/i;

function parseExtrasQty(li: ChargebeeInvoiceLineItem | undefined): number {
  if (!li?.description) return 0;
  const m = li.description.match(EXTRA_RE);
  return m ? parseInt(m[1], 10) : 0;
}

async function applyExtrasInvoice(inv: ChargebeeInvoice): Promise<void> {
  if (!inv.line_items?.length || !inv.customer_id) return;
  const userId = inv.customer_id;
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return;
  const [sub] = await db.select().from(subscriptions)
    .where(eq(subscriptions.chargebeeCustomerId, userId)).limit(1);
  if (!sub?.currentTermStart || !sub.planItemPriceId) return;
  const planMeta =
    sub.planItemPriceId === PLANS.basic.priceId ? PLANS.basic :
    sub.planItemPriceId === PLANS.pro.priceId ? PLANS.pro :
    sub.planItemPriceId === PLANS.enterprise.priceId ? PLANS.enterprise : null;
  if (!planMeta) return;

  for (const li of inv.line_items) {
    const qty = parseExtrasQty(li);
    if (qty <= 0) continue;
    try {
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await db.insert(purchasedExtras).values({
        userId,
        periodStart: sub.currentTermStart,
        quantity: qty,
        quantityUsed: 0,
        expiresAt,
        unitPriceEur: planMeta.overagePerSessionEur,
        chargebeeInvoiceId: inv.id,
        chargebeeChargeId: li.id
      });
      console.log("[chargebee webhook] defense inserted extras qty=", qty, "invoice=", inv.id);
    } catch { /* unique on invoice_id -> already inserted by buy-extras */ }
  }
}

import { db } from "@/lib/db";
import { subscriptions, sessions, sessionConsumptions, purchasedExtras, users } from "@/db/schema";
import { PLANS, type PlanId } from "@/lib/chargebee";
import { and, eq, isNull, sql, gt, asc } from "drizzle-orm";

export type QuotaState = {
  hasActiveSub: boolean;
  bypass: boolean;
  planId: PlanId | null;
  // Base: monthly allowance, expires at period end
  baseQuota: number;
  baseUsed: number;
  baseRemaining: number;
  // Extras: purchased credits, expire 1y from purchase
  extrasAvailable: number;
  // Combined
  totalQuota: number;
  consumed: number;  // total consumption count this period (base + credit usage in this period)
  drafts: number;
  slotsInUse: number;
  remaining: number;
  periodStart: Date | null;
  periodEnd: Date | null;
};

function planIdFromPriceId(priceId: string | null): PlanId | null {
  if (!priceId) return null;
  if (priceId === PLANS.basic.priceId || priceId === PLANS.basic.yearlyPriceId) return "basic";
  if (priceId === PLANS.pro.priceId || priceId === PLANS.pro.yearlyPriceId) return "pro";
  if (priceId === PLANS.enterprise.priceId || priceId === PLANS.enterprise.yearlyPriceId) return "enterprise";
  return null;
}

export async function loadQuotaState(userId: string): Promise<QuotaState> {
  const [u] = await db.select({ email: users.email, isAdmin: users.isAdmin })
    .from(users).where(eq(users.id, userId)).limit(1);
  const bypass = u?.isAdmin === true;

  const [sub] = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, userId)).limit(1);
  const status = sub?.status ?? "inactive";
  const hasActiveSub = !!sub && ["active","in_trial","non_renewing"].includes(status);
  const planId = planIdFromPriceId(sub?.planItemPriceId ?? null);
  const baseQuota = hasActiveSub && planId ? PLANS[planId].includedSessions : 0;
  const periodStart = sub?.currentTermStart ?? null;
  const periodEnd = sub?.currentTermEnd ?? null;

  let consumed = 0;
  let baseUsed = 0;
  if (periodStart) {
    const cRes = await db.select({ c: sql<number>`count(*)::int` })
      .from(sessionConsumptions)
      .where(and(eq(sessionConsumptions.userId, userId), eq(sessionConsumptions.periodStart, periodStart)));
    consumed = cRes[0]?.c ?? 0;
    const bRes = await db.select({ c: sql<number>`count(*)::int` })
      .from(sessionConsumptions)
      .where(and(eq(sessionConsumptions.userId, userId), eq(sessionConsumptions.periodStart, periodStart), isNull(sessionConsumptions.creditId)));
    baseUsed = bRes[0]?.c ?? 0;
  }

  // Available extras: not yet fully used, not expired
  const extrasRows = await db.select({
    avail: sql<number>`coalesce(sum(quantity - quantity_used), 0)::int`
  })
    .from(purchasedExtras)
    .where(and(eq(purchasedExtras.userId, userId), gt(purchasedExtras.expiresAt, new Date())));
  const extrasAvailable = extrasRows[0]?.avail ?? 0;

  const dRes = await db.select({ c: sql<number>`count(*)::int` })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNull(sessions.firstMessageAt), isNull(sessions.archivedAt)));
  const drafts = dRes[0]?.c ?? 0;

  const baseRemaining = Math.max(0, baseQuota - baseUsed);
  const totalQuota = baseQuota + extrasAvailable;
  const slotsInUse = consumed + drafts;
  const remaining = bypass ? 999 : Math.max(0, totalQuota - slotsInUse);

  return {
    hasActiveSub, bypass, planId,
    baseQuota, baseUsed, baseRemaining,
    extrasAvailable,
    totalQuota, consumed, drafts, slotsInUse, remaining,
    periodStart, periodEnd
  };
}

export async function canCreateSession(userId: string): Promise<{ ok: boolean; reason?: string; state: QuotaState }> {
  const state = await loadQuotaState(userId);
  if (state.bypass) return { ok: true, state };
  // Allow if any slot available (base OR extras), regardless of sub status
  if (state.totalQuota <= 0) return { ok: false, reason: "no_subscription", state };
  if (state.remaining <= 0) return { ok: false, reason: "quota_exceeded", state };
  return { ok: true, state };
}

export async function consumeSlotOnFirstMessage(opts: {
  userId: string;
  sessionId: string;
  periodStart: Date | null;
}): Promise<{ firstTime: boolean; usedCredit: boolean }> {
  const upd = await db.update(sessions)
    .set({ firstMessageAt: new Date() })
    .where(and(eq(sessions.id, opts.sessionId), isNull(sessions.firstMessageAt)))
    .returning({ id: sessions.id });
  if (upd.length === 0) return { firstTime: false, usedCredit: false };

  const state = await loadQuotaState(opts.userId);
  let creditId: string | null = null;

  if (state.baseRemaining <= 0 && state.extrasAvailable > 0) {
    const candidates = await db.select().from(purchasedExtras)
      .where(and(
        eq(purchasedExtras.userId, opts.userId),
        gt(purchasedExtras.expiresAt, new Date())
      ))
      .orderBy(asc(purchasedExtras.expiresAt));
    for (const c of candidates) {
      if ((c.quantityUsed ?? 0) < c.quantity) {
        const inc = await db.update(purchasedExtras)
          .set({ quantityUsed: sql`quantity_used + 1` })
          .where(and(eq(purchasedExtras.id, c.id), sql`quantity_used < quantity`))
          .returning({ id: purchasedExtras.id });
        if (inc.length > 0) { creditId = c.id; break; }
      }
    }
  }

  try {
    await db.insert(sessionConsumptions).values({
      userId: opts.userId,
      sessionId: opts.sessionId,
      periodStart: opts.periodStart ?? new Date(),
      consumedAt: new Date(),
      creditId
    });
  } catch { /* unique violation = already consumed */ }
  return { firstTime: true, usedCredit: creditId !== null };
}

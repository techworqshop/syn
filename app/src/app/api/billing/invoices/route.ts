import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions, purchasedExtras } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { requireUser } from "@/lib/current-user";
import { chargebee, isBillingConfigured, PLANS, type PlanId } from "@/lib/chargebee";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LineItem = {
  entity_type?: string;
  entity_id?: string;
  date_from?: number;
  date_to?: number;
  amount?: number;
  quantity?: number;
  description?: string;
};

export async function GET() {
  if (!isBillingConfigured() || !chargebee) {
    return NextResponse.json({ invoices: [] });
  }
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }

  const [sub] = await db.select().from(subscriptions)
    .where(eq(subscriptions.userId, user.id)).limit(1);
  if (!sub?.chargebeeCustomerId) {
    return NextResponse.json({ invoices: [] });
  }

  try {
    const result = await chargebee.invoice.list({
      limit: 50,
      "customer_id[is]": sub.chargebeeCustomerId,
      "sort_by[desc]": "date"
    } as unknown as Record<string, unknown>);
    type CbInvoice = {
      id: string; date: number; total: number; amount_paid: number;
      status: string; currency_code: string; line_items?: LineItem[];
    };
    const list = (result as { list?: Array<{ invoice: CbInvoice }> }).list ?? [];
    const invoiceIds = list.map(item => item.invoice.id);

    const extrasRows = invoiceIds.length > 0
      ? await db.select().from(purchasedExtras).where(and(
          eq(purchasedExtras.userId, user.id),
          inArray(purchasedExtras.chargebeeInvoiceId, invoiceIds)
        ))
      : [];
    const extrasByInvoiceId = new Map(
      extrasRows.filter(r => r.chargebeeInvoiceId).map(r => [r.chargebeeInvoiceId!, r])
    );

    const planByEntityId: Record<string, { planId: PlanId; cycle: "monthly" | "yearly" }> = {};
    for (const pid of ["basic", "pro", "enterprise"] as const) {
      planByEntityId[PLANS[pid].priceId]       = { planId: pid, cycle: "monthly" };
      planByEntityId[PLANS[pid].yearlyPriceId] = { planId: pid, cycle: "yearly" };
    }

    const invoices = list.map(item => {
      const inv = item.invoice;
      const base = {
        id: inv.id,
        date: inv.date,
        total: inv.total,
        amountPaid: inv.amount_paid,
        status: inv.status,
        currency: inv.currency_code
      };
      const matchedExtras = extrasByInvoiceId.get(inv.id);
      if (matchedExtras) {
        return {
          ...base,
          type: "extras" as const,
          quantity: matchedExtras.quantity,
          expiresAt: matchedExtras.expiresAt?.toISOString() ?? null,
          unitPriceEur: matchedExtras.unitPriceEur
        };
      }

      const lineItems = inv.line_items ?? [];
      const planLine = lineItems.find(li =>
        (li.entity_type === "plan_item_price" || li.entity_type === "subscription") &&
        li.entity_id && planByEntityId[li.entity_id]
      ) ?? lineItems.find(li => li.entity_id && planByEntityId[li.entity_id]);
      const meta = planLine?.entity_id ? planByEntityId[planLine.entity_id] : null;
      return {
        ...base,
        type: "subscription" as const,
        planId: meta?.planId ?? null,
        cycle: meta?.cycle ?? null,
        periodStart: planLine?.date_from ?? null,
        periodEnd: planLine?.date_to ?? null
      };
    });
    return NextResponse.json({ invoices });
  } catch (e) {
    console.error("[billing/invoices] failed:", e);
    return NextResponse.json({ invoices: [], error: "failed" }, { status: 502 });
  }
}

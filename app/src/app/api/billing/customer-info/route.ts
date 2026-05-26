import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/current-user";
import { chargebee, isBillingConfigured } from "@/lib/chargebee";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CbCustomer = {
  id: string;
  first_name?: string; last_name?: string;
  company?: string; email?: string;
  vat_number?: string; vat_number_status?: string;
  billing_address?: {
    line1?: string; line2?: string; city?: string;
    zip?: string; state?: string; country?: string;
  };
};

export async function GET() {
  if (!isBillingConfigured() || !chargebee) return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).limit(1);
  if (!sub?.chargebeeCustomerId) return NextResponse.json({ error: "no customer" }, { status: 404 });
  try {
    const res = await chargebee.customer.retrieve(sub.chargebeeCustomerId) as unknown as { customer: CbCustomer };
    const c = res.customer;
    return NextResponse.json({
      firstName: c.first_name ?? "",
      lastName: c.last_name ?? "",
      company: c.company ?? "",
      email: c.email ?? "",
      vatNumber: c.vat_number ?? "",
      vatStatus: c.vat_number_status ?? null,
      line1: c.billing_address?.line1 ?? "",
      line2: c.billing_address?.line2 ?? "",
      city: c.billing_address?.city ?? "",
      zip: c.billing_address?.zip ?? "",
      state: c.billing_address?.state ?? "",
      country: c.billing_address?.country ?? "DE"
    });
  } catch (e) {
    console.error("[customer-info GET]", e);
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}

export async function PUT(req: Request) {
  if (!isBillingConfigured() || !chargebee) return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  let user;
  try { user = await requireUser(); } catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).limit(1);
  if (!sub?.chargebeeCustomerId) return NextResponse.json({ error: "no customer" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const s = (k: string) => typeof body?.[k] === "string" ? (body[k] as string).trim() : "";

  try {
    // Update customer-level fields (name, company, email, VAT)
    await chargebee.customer.update(sub.chargebeeCustomerId, {
      first_name: s("firstName"),
      last_name: s("lastName"),
      company: s("company"),
      email: s("email")
    } as unknown as Record<string, unknown>);
  } catch (e) {
    console.error("[customer-info PUT customer.update]", e);
    return NextResponse.json({ error: (e as { message?: string })?.message ?? "update failed" }, { status: 502 });
  }

  try {
    // Update billing address
    await chargebee.customer.updateBillingInfo(sub.chargebeeCustomerId, {
      vat_number: s("vatNumber") || undefined,
      billing_address: {
        first_name: s("firstName"),
        last_name: s("lastName"),
        company: s("company"),
        line1: s("line1"),
        line2: s("line2"),
        city: s("city"),
        zip: s("zip"),
        state: s("state"),
        country: s("country") || "DE"
      }
    } as unknown as Record<string, unknown>);
  } catch (e) {
    console.error("[customer-info PUT billing_address]", e);
    return NextResponse.json({ error: (e as { message?: string })?.message ?? "address update failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

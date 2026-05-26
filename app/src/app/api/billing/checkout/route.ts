import { NextResponse } from "next/server";
import { requireUser } from "@/lib/current-user";
import { createCheckoutNewSubscription, PLANS, isPlanId, isBillingConfigured } from "@/lib/chargebee";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isBillingConfigured()) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }

  let plan: string | undefined;
  let cycle: string = "monthly";
  try {
    const body = await req.json().catch(() => ({}));
    plan = typeof body?.plan === "string" ? body.plan : undefined;
    if (body?.cycle === "yearly") cycle = "yearly";
  } catch { /* ignore */ }
  if (!isPlanId(plan)) {
    return NextResponse.json({ error: "invalid plan" }, { status: 400 });
  }
  const meta = PLANS[plan];
  const priceId = cycle === "yearly" ? meta.yearlyPriceId : meta.priceId;

  const PUBLIC_BASE = process.env.PUBLIC_BASE_URL || "https://syn.worqshop.io";
  try {
    const url = await createCheckoutNewSubscription({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      itemPriceId: priceId,
      redirectUrl: `${PUBLIC_BASE}/app/billing?status=success`,
      cancelUrl: `${PUBLIC_BASE}/app/billing?status=cancel`
    });
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[billing/checkout] failed:", e);
    return NextResponse.json({ error: "checkout failed" }, { status: 500 });
  }
}


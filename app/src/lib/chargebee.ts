import Chargebee from "chargebee";

const site = process.env.CHARGEBEE_SITE;
const apiKey = process.env.CHARGEBEE_API_KEY;

if (!site || !apiKey) {
  console.warn("[chargebee] CHARGEBEE_SITE or CHARGEBEE_API_KEY missing - billing disabled");
}

export const chargebee = site && apiKey
  ? new Chargebee({ site, apiKey })
  : null;

export const CHARGEBEE_SITE = site ?? "";
export type PlanId = "basic" | "pro" | "enterprise";

export type Cycle = "monthly" | "yearly";

export type PlanMeta = {
  priceId: string;
  yearlyPriceId: string;
  overagePriceId: string;
  basePriceEur: number;
  yearlyPriceEur: number;
  includedSessions: number;
  overagePerSessionEur: number;
};


export const PLANS: Record<PlanId, PlanMeta> = {
  basic: {
    priceId: "syn-basic-monthly-eur",
    yearlyPriceId: "syn-basic-yearly-eur",
    overagePriceId: "syn-basic-overage-monthly-eur",
    basePriceEur: 150, yearlyPriceEur: 1440,
    includedSessions: 5,  overagePerSessionEur: 35
  },
  pro: {
    priceId: "syn-pro-monthly-eur",
    yearlyPriceId: "syn-pro-yearly-eur",
    overagePriceId: "syn-pro-overage-monthly-eur",
    basePriceEur: 350, yearlyPriceEur: 3360,
    includedSessions: 15, overagePerSessionEur: 28
  },
  enterprise: {
    priceId: "syn-enterprise-monthly-eur",
    yearlyPriceId: "syn-enterprise-yearly-eur",
    overagePriceId: "syn-enterprise-overage-monthly-eur",
    basePriceEur: 900, yearlyPriceEur: 8640,
    includedSessions: 50, overagePerSessionEur: 22
  }
};

export function isPlanId(x: unknown): x is PlanId {
  return x === "basic" || x === "pro" || x === "enterprise";
}

export function isBillingConfigured() {
  return chargebee !== null;
}

// Hosted Page checkout - returns a URL the user clicks through
export async function createCheckoutNewSubscription(opts: {
  userId: string;
  userEmail: string;
  userName?: string | null;
  itemPriceId: string;
  redirectUrl: string;
  cancelUrl?: string;
}): Promise<string> {
  if (!chargebee) throw new Error("Chargebee not configured");
  const result = await chargebee.hostedPage.checkoutNewForItems({
    subscription_items: [{ item_price_id: opts.itemPriceId, quantity: 1 }],
    customer: {
      id: opts.userId,
      email: opts.userEmail,
      first_name: opts.userName ?? undefined
    },
    redirect_url: opts.redirectUrl,
    cancel_url: opts.cancelUrl ?? opts.redirectUrl
  });
  const hp = result.hosted_page;
  if (!hp?.url) throw new Error("Chargebee did not return a hosted_page url");
  return hp.url;
}

// Customer Portal session - returns the access_url to redirect user to
export async function createPortalSession(opts: {
  customerId: string;
  redirectUrl: string;
}): Promise<string> {
  if (!chargebee) throw new Error("Chargebee not configured");
  const result = await chargebee.portalSession.create({
    customer: { id: opts.customerId },
    redirect_url: opts.redirectUrl
  });
  const url = result.portal_session?.access_url;
  if (!url) throw new Error("Chargebee did not return a portal_session access_url");
  return url;
}

// Bridge the webhook delay after Checkout: pull the freshest subscription state
// from Chargebee for this customer and persist it to our DB.
export async function fetchLatestSubscriptionForCustomer(customerId: string) {
  if (!chargebee) return null;
  try {
    type CbSub = {
      id: string; status: string; current_term_start?: number; current_term_end?: number;
      trial_end?: number; cancelled_at?: number; customer_id: string;
      subscription_items?: Array<{ item_price_id: string }>;
    };
    const result = await chargebee.subscription.list({
      "customer_id[is]": customerId,
      "sort_by[desc]": "created_at",
      limit: 1
    } as unknown as Record<string, unknown>) as unknown as { list?: Array<{ subscription: CbSub }> };
    return result.list?.[0]?.subscription ?? null;
  } catch (e) {
    console.warn("[chargebee] fetchLatestSubscriptionForCustomer failed:", e);
    return null;
  }
}

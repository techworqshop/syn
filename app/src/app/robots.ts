import type { MetadataRoute } from "next";

// force-dynamic ist Pflicht: robots.txt wuerde sonst zur BUILD-Zeit erzeugt,
// wo PUBLIC_BASE_URL noch nicht gesetzt ist (kommt erst per env_file zur Laufzeit).
export const dynamic = "force-dynamic";

const PROD_HOST = "asksyn.com";

/**
 * robots.txt.
 *
 * DEV (syn.worqshop.io) ist oeffentlich erreichbar und wird komplett gesperrt —
 * sonst konkurriert die Dev-Kopie in der Suche mit der echten Seite (Duplicate Content).
 *
 * Auf PROD gesperrt wird alles Private oder Zwischenschritt-artige:
 * /app/* (Auth), /share/* (KUNDENINHALTE), /invite/* (Token), /api/*,
 * Auth-/Billing-Zwischenseiten. robots.txt verhindert nur das Crawlen —
 * /share/* und /invite/* setzen zusaetzlich `noindex`.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.PUBLIC_BASE_URL || `https://${PROD_HOST}`;
  const isProd = base.includes(PROD_HOST);

  if (!isProd) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/app/",
          "/share/",
          "/invite/",
          "/api/",
          "/verify-email",
          "/confirm-email-change",
          "/forgot-password",
          "/reset-password",
          "/checkout",
          "/billing",
          "/payment-failed",
          "/landing"
        ]
      }
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base
  };
}

import type { MetadataRoute } from "next";

// Wie robots.ts: zur Laufzeit auswerten, sonst landet der Build-Fallback
// in den URLs statt PUBLIC_BASE_URL.
export const dynamic = "force-dynamic";

/**
 * sitemap.xml — nur oeffentliche, indexierbare Seiten.
 * Bewusst NICHT enthalten: /app/*, /share/*, /invite/* (privat bzw. Kundeninhalte),
 * Auth-/Billing-Zwischenseiten, /landing (Redirect auf /) und /terms
 * (Alt-Seite; die AGB liegen zweisprachig unter /agb).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // Apex-Domain fuer Marketing-URLs (PUBLIC_BASE_URL ist die App-Domain).
  const base = (process.env.PUBLIC_BASE_URL || "https://asksyn.com").replace("://app.", "://");
  const now = new Date();
  return [
    { url: `${base}/`,            lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/register`,    lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/login`,       lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
    { url: `${base}/agb`,         lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/datenschutz`, lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/impressum`,   lastModified: now, changeFrequency: "yearly",  priority: 0.3 }
  ];
}

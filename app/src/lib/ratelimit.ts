// Redis-basierter Rate-Limiter: per-Key Sliding-Window via INCR + EXPIRE.
// Atomic via Redis-Pipeline. Fail-Open bei Redis-Ausfall (sicherer als
// fail-closed weil sonst legitime User locked-out waeren).
import { getPub } from "./redis";

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetIn: number; // Sekunden bis Reset
};

/**
 * Inkrementiert den Counter fuer `key`. Wenn er ueber `limit` geht innerhalb
 * von `windowSec` Sekunden, return ok=false.
 * @example const r = await ratelimit(`login:${ip}`, 5, 60);  // 5 versuche / minute
 */
export async function ratelimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  try {
    const r = getPub();
    // Pipeline: INCR + EXPIRE-if-new + TTL — atomar.
    const pipe = r.multi();
    pipe.incr(key);
    pipe.expire(key, windowSec, "NX"); // setze TTL nur wenn key neu (sliding-window-Verhalten)
    pipe.ttl(key);
    const results = await pipe.exec();
    if (!results) throw new Error("redis exec returned null");
    const count = results[0]?.[1] as number;
    const ttl = results[2]?.[1] as number;
    return {
      ok: count <= limit,
      remaining: Math.max(0, limit - count),
      resetIn: ttl > 0 ? ttl : windowSec
    };
  } catch (e) {
    // Fail-open: Redis aus -> wir lassen den Request durch, loggen aber lautstark
    console.error("[ratelimit] Redis error — failing open:", e);
    return { ok: true, remaining: limit, resetIn: windowSec };
  }
}

/**
 * Holt die Client-IP aus den Request-Headers. Caddy setzt X-Forwarded-For,
 * der erste Eintrag ist der echte Client (Trust-Chain ist sicher weil hinter Caddy).
 */
export async function getClientIp(): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

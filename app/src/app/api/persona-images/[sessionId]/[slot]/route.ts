import fs from "node:fs";
import { db } from "@/lib/db";
import { personaImages, sessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

type P = { params: Promise<{ sessionId: string; slot: string }> };

// Persona-Image-Endpoint mit Access-Control:
// - Eingeloggter Session-Owner: erlaubt
// - Anonyme via Share-Token (?share=TOKEN, muss sessions.shareToken matchen)
// Sonst 404 (Existenz wird nicht geleakt).
export async function GET(req: Request, { params }: P) {
  const { sessionId, slot } = await params;
  const slotNum = parseInt(slot);
  if (!Number.isFinite(slotNum)) return new Response("not found", { status: 404 });

  // Access-Check: Owner ODER Share-Token
  let allowed = false;

  // Variante A: eingeloggter Owner
  try {
    const session = await auth();
    const userId = session?.user && (session.user as unknown as { id?: string }).id;
    if (userId) {
      const [own] = await db.select({ id: sessions.id })
        .from(sessions)
        .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
        .limit(1);
      if (own) allowed = true;
    }
  } catch { /* fail-closed: weiter zur Token-Variante */ }

  // Variante B: Share-Token
  if (!allowed) {
    const token = new URL(req.url).searchParams.get("share");
    if (token) {
      const [sess] = await db.select({ id: sessions.id })
        .from(sessions)
        .where(and(eq(sessions.id, sessionId), eq(sessions.shareToken, token)))
        .limit(1);
      if (sess) allowed = true;
    }
  }

  if (!allowed) return new Response("not found", { status: 404 });

  let row;
  try {
    const rows = await db.select().from(personaImages)
      .where(and(eq(personaImages.sessionId, sessionId), eq(personaImages.slot, slotNum))).limit(1);
    row = rows[0];
  } catch { return new Response("not found", { status: 404 }); }
  if (!row || !row.storagePath) return new Response("not found", { status: 404 });
  if (!fs.existsSync(row.storagePath)) return new Response("gone", { status: 410 });
  // ETag (size+mtime) so the browser re-fetches after a regeneration (persona swap)
  // but gets a cheap 304 when unchanged. no-cache forces revalidation before reuse.
  const st = fs.statSync(row.storagePath);
  const etag = `"${st.size}-${Math.floor(st.mtimeMs)}"`;
  const baseHeaders: Record<string, string> = { "Cache-Control": "private, no-cache, must-revalidate", "ETag": etag };
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: baseHeaders });
  }
  const buf = fs.readFileSync(row.storagePath);
  return new Response(buf, { headers: { ...baseHeaders, "Content-Type": row.mimeType } });
}

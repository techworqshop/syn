import fs from "node:fs";
import { db } from "@/lib/db";
import { personaImages } from "@/db/schema";
import { and, eq } from "drizzle-orm";

type P = { params: Promise<{ sessionId: string; slot: string }> };

export async function GET(_: Request, { params }: P) {
  const { sessionId, slot } = await params;
  const slotNum = parseInt(slot);
  let row;
  try {
    const rows = await db.select().from(personaImages)
      .where(and(eq(personaImages.sessionId, sessionId), eq(personaImages.slot, slotNum))).limit(1);
    row = rows[0];
  } catch { return new Response("not found", { status: 404 }); }
  if (!row || !row.storagePath) return new Response("not found", { status: 404 });
  if (!fs.existsSync(row.storagePath)) return new Response("gone", { status: 410 });
  const buf = fs.readFileSync(row.storagePath);
  return new Response(buf, {
    headers: { "Content-Type": row.mimeType, "Cache-Control": "private, max-age=3600" }
  });
}

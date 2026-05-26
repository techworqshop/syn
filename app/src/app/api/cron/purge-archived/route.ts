import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, files } from "@/db/schema";
import { and, lt, isNotNull, eq } from "drizzle-orm";
import { deleteFileFromPanel } from "@/lib/n8n";
import fs from "node:fs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function auth(req: Request): boolean {
  const sec = process.env.CRON_SECRET;
  if (!sec) return false;
  const h = req.headers.get("authorization") || "";
  return h === `Bearer ${sec}`;
}

export async function POST(req: Request) {
  if (!auth(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const expired = await db.select().from(sessions)
    .where(and(isNotNull(sessions.archivedAt), lt(sessions.archivedAt, cutoff)));
  let purged = 0;
  for (const sess of expired) {
    const sessFiles = await db.select().from(files).where(eq(files.sessionId, sess.id));
    for (const f of sessFiles) {
      try { if (fs.existsSync(f.storagePath)) fs.unlinkSync(f.storagePath); } catch {}
      try { await deleteFileFromPanel(f.id); } catch {}
    }
    await db.delete(sessions).where(eq(sessions.id, sess.id));
    purged++;
  }
  return NextResponse.json({ ok: true, purged, cutoff: cutoff.toISOString() });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/db/schema";
import { and, isNull, lt, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function auth(req: Request): boolean {
  const sec = process.env.CRON_SECRET;
  if (!sec) return false;
  const h = req.headers.get("authorization") || "";
  return h === `Bearer ${sec}`;
}

export async function POST(req: Request) {
  if (!auth(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  // Delete draft sessions (no first message) older than 30 days
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await db.delete(sessions)
    .where(and(isNull(sessions.firstMessageAt), lt(sessions.createdAt, cutoff)))
    .returning({ id: sessions.id });
  void sql; // keep import alive
  return NextResponse.json({ ok: true, deleted: result.length, cutoff: cutoff.toISOString() });
}

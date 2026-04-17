import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, files } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { and, eq, asc } from "drizzle-orm";

type P = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: P) {
  const u = await requireUser();
  const { id } = await params;
  const [sess] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id))).limit(1);
  if (!sess) return NextResponse.json({ error: "not found" }, { status: 404 });
  const rows = await db.select().from(files)
    .where(eq(files.sessionId, id)).orderBy(asc(files.createdAt));
  return NextResponse.json({ files: rows });
}

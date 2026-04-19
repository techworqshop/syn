import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { and, eq } from "drizzle-orm";

type P = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: P) {
  const u = await requireUser();
  const { id } = await params;
  const [sess] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id))).limit(1);
  if (!sess) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [row] = await db.insert(sessions).values({
    userId: u.id,
    title: (sess.title || "Fokusgruppe") + " (Kopie)",
    titleLocked: true,
    problemBrief: sess.problemBrief,
    rigidityScore: sess.rigidityScore
  }).returning();
  return NextResponse.json({ session: row });
}

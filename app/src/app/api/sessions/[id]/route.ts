import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { and, eq } from "drizzle-orm";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const [row] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id))).limit(1);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ session: row });
}

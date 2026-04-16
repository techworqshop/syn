import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const u = await requireUser();
  const rows = await db.select().from(sessions).where(eq(sessions.userId, u.id)).orderBy(desc(sessions.updatedAt));
  return NextResponse.json({ sessions: rows });
}

export async function POST(req: Request) {
  const u = await requireUser();
  const body = await req.json().catch(() => ({}));
  const title = (body?.title as string) || "Neue Fokusgruppe";
  const [row] = await db.insert(sessions).values({ userId: u.id, title }).returning();
  return NextResponse.json({ session: row });
}

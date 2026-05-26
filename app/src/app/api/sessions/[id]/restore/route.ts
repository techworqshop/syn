import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { and, eq, isNotNull } from "drizzle-orm";
import { audit } from "@/lib/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const [sess] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id), isNotNull(sessions.archivedAt)))
    .limit(1);
  if (!sess) return NextResponse.json({ error: "not found or not archived" }, { status: 404 });
  await db.update(sessions).set({ archivedAt: null }).where(eq(sessions.id, id));
  await audit({
    actorId: u.id, actorEmail: u.email,
    action: "session.restore_own",
    targetType: "session", targetId: id,
    metadata: { title: sess.title }
  });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
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
  let token = sess.shareToken;
  if (!token) {
    token = randomBytes(18).toString("base64url");
    await db.update(sessions).set({ shareToken: token }).where(eq(sessions.id, id));
  }
  const base = process.env.PUBLIC_BASE_URL || "";
  return NextResponse.json({ token, url: `${base}/share/${token}` });
}

export async function DELETE(_: Request, { params }: P) {
  const u = await requireUser();
  const { id } = await params;
  await db.update(sessions).set({ shareToken: null })
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id)));
  return NextResponse.json({ ok: true });
}

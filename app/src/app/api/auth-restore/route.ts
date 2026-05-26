import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  if (!email || !password) {
    return NextResponse.json({ error: "missing credentials" }, { status: 400 });
  }

  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }
  if (!u.deletionRequestedAt) {
    return NextResponse.json({ error: "no pending deletion" }, { status: 409 });
  }

  await db.update(users)
    .set({ deletionRequestedAt: null, updatedAt: new Date() })
    .where(eq(users.id, u.id));
  console.log(`[users/cancel-deletion] User ${email} reactivated`);
  return NextResponse.json({ ok: true });
}

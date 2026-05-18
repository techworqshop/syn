import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { adminGuard, requireAdmin } from "@/lib/current-user";
import { eq } from "drizzle-orm";
import { audit } from "@/lib/log";
import { headers } from "next/headers";

type P = { params: Promise<{ id: string }> };

export async function DELETE(_: Request, { params }: P) {
  const denied = await adminGuard();
  if (denied) return denied;
  const me = await requireAdmin();
  const { id } = await params;
  if (id === me.id) {
    return NextResponse.json({ error: "cannot delete yourself" }, { status: 400 });
  }
  // Fetch email before delete for audit context
  const [target] = await db.select({ email: users.email }).from(users).where(eq(users.id, id)).limit(1);
  await db.delete(users).where(eq(users.id, id));
  const h = await headers();
  await audit({
    actorId: me.id,
    actorEmail: me.email,
    action: "user.delete",
    targetType: "user",
    targetId: id,
    metadata: { targetEmail: target?.email ?? null },
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined
  });
  return NextResponse.json({ ok: true });
}

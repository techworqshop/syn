import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invites } from "@/db/schema";
import { adminGuard, requireAdmin } from "@/lib/current-user";
import { eq } from "drizzle-orm";
import { audit } from "@/lib/log";
import { headers } from "next/headers";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard();
  if (denied) return denied;
  const me = await requireAdmin();
  const { id } = await params;
  const [target] = await db.select({ email: invites.email }).from(invites).where(eq(invites.id, id)).limit(1);
  await db.delete(invites).where(eq(invites.id, id));
  const h = await headers();
  await audit({
    actorId: me.id,
    actorEmail: me.email,
    action: "invite.delete",
    targetType: "invite",
    targetId: id,
    metadata: { recipientEmail: target?.email ?? null },
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined
  });
  return NextResponse.json({ ok: true });
}

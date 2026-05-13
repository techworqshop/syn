import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { adminGuard, requireAdmin } from "@/lib/current-user";
import { eq } from "drizzle-orm";

type P = { params: Promise<{ id: string }> };

export async function DELETE(_: Request, { params }: P) {
  const denied = await adminGuard();
  if (denied) return denied;
  const me = await requireAdmin();
  const { id } = await params;
  if (id === me.id) {
    return NextResponse.json({ error: "cannot delete yourself" }, { status: 400 });
  }
  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}

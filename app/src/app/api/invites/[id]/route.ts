import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invites } from "@/db/schema";
import { adminGuard } from "@/lib/current-user";
import { eq } from "drizzle-orm";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id } = await params;
  await db.delete(invites).where(eq(invites.id, id));
  return NextResponse.json({ ok: true });
}

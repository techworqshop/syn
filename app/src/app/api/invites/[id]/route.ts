import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invites } from "@/db/schema";
import { requireUser, requireAdmin } from "@/lib/current-user";
import { eq } from "drizzle-orm";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  await db.delete(invites).where(eq(invites.id, id));
  return NextResponse.json({ ok: true });
}

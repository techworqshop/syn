import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { adminGuard, requireAdmin } from "@/lib/current-user";
import { eq } from "drizzle-orm";

type P = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: P) {
  const denied = await adminGuard();
  if (denied) return denied;
  const me = await requireAdmin();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (typeof body?.isAdmin !== "boolean") {
    return NextResponse.json({ error: "isAdmin (boolean) required" }, { status: 400 });
  }
  // Self-Demotion verhindern (sonst sperrt sich der letzte Admin aus)
  if (id === me.id && body.isAdmin === false) {
    return NextResponse.json({ error: "kannst dir selber den Admin-Status nicht entziehen" }, { status: 400 });
  }
  const [row] = await db.update(users).set({ isAdmin: body.isAdmin, updatedAt: new Date() })
    .where(eq(users.id, id)).returning({ id: users.id, email: users.email, isAdmin: users.isAdmin });
  if (!row) return NextResponse.json({ error: "user not found" }, { status: 404 });
  return NextResponse.json({ ok: true, user: row });
}

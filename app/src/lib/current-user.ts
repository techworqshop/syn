import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.email) {
    const e = new Error("Unauthorized") as Error & { status?: number };
    e.status = 401;
    throw e;
  }
  const [u] = await db.select().from(users).where(eq(users.email, session.user.email)).limit(1);
  if (!u) {
    const e = new Error("User not found") as Error & { status?: number };
    e.status = 401;
    throw e;
  }
  return u;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (!u.isAdmin) {
    const e = new Error("Forbidden") as Error & { status?: number };
    e.status = 403;
    throw e;
  }
  return u;
}

// API-Helper: gibt einen Response-Wert zurück wenn nicht-Admin, sonst null.
// Verwendung:
//   const denied = await adminGuard();
//   if (denied) return denied;
//   const me = await requireAdmin();  // sicher, schon validiert
export async function adminGuard(): Promise<NextResponse | null> {
  try {
    await requireAdmin();
    return null;
  } catch (e) {
    const err = e as { status?: number; message?: string };
    const status = err.status === 401 ? 401 : 403;
    return NextResponse.json({ error: err.message || "Forbidden" }, { status });
  }
}

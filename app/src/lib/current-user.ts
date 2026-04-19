import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");
  const [u] = await db.select().from(users).where(eq(users.email, session.user.email)).limit(1);
  if (!u) throw new Error("User not found");
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

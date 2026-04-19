import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/current-user";
import { desc } from "drizzle-orm";

export async function GET() {
  await requireAdmin();
  const rows = await db.select({
    id: users.id, email: users.email, name: users.name,
    isAdmin: users.isAdmin, createdAt: users.createdAt
  }).from(users).orderBy(desc(users.createdAt));
  return NextResponse.json({ users: rows });
}

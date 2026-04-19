import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invites } from "@/db/schema";
import { and, eq, isNull, gt } from "drizzle-orm";

type P = { params: Promise<{ token: string }> };

export async function GET(_: Request, { params }: P) {
  const { token } = await params;
  const [inv] = await db.select().from(invites)
    .where(and(eq(invites.token, token), isNull(invites.usedAt), gt(invites.expiresAt, new Date())))
    .limit(1);
  if (!inv) return NextResponse.json({ error: "invalid or expired" }, { status: 404 });
  return NextResponse.json({ email: inv.email });
}

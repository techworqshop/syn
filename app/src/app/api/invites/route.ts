import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { invites, users } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { sendInviteEmail } from "@/lib/n8n";
import { desc, eq, and, isNull, gt } from "drizzle-orm";

const BASE = process.env.PUBLIC_BASE_URL || "";

export async function GET() {
  await requireUser();
  const rows = await db.select().from(invites).orderBy(desc(invites.createdAt));
  return NextResponse.json({ invites: rows });
}

export async function POST(req: Request) {
  const u = await requireUser();
  const body = await req.json().catch(() => ({}));
  const email = (body?.email as string | undefined)?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }
  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser) return NextResponse.json({ error: "user exists" }, { status: 409 });
  const token = randomBytes(24).toString("base64url");
  const [inv] = await db.insert(invites).values({
    email, token, invitedBy: u.id,
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  }).returning();
  const inviteUrl = `${BASE}/invite/${token}`;
  const mailed = await sendInviteEmail({
    recipientEmail: email,
    inviterName: u.name || u.email,
    inviteUrl
  });
  return NextResponse.json({ invite: inv, inviteUrl, mailed });
}

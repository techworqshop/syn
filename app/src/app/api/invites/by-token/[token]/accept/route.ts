import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { invites, users } from "@/db/schema";
import { and, eq, isNull, gt } from "drizzle-orm";
import { issueVerificationToken } from "@/app/verify-email/actions";

type P = { params: Promise<{ token: string }> };

export async function POST(req: Request, { params }: P) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));
  const password = (body?.password as string) || "";
  const name = ((body?.name as string) || "").trim();
  if (password.length < 8) {
    return NextResponse.json({ error: "password too short (min 8)" }, { status: 400 });
  }
  const [inv] = await db.select().from(invites)
    .where(and(eq(invites.token, token), isNull(invites.usedAt), gt(invites.expiresAt, new Date())))
    .limit(1);
  if (!inv) return NextResponse.json({ error: "invalid or expired" }, { status: 404 });
  const [exists] = await db.select().from(users).where(eq(users.email, inv.email)).limit(1);
  if (exists) return NextResponse.json({ error: "user already exists" }, { status: 409 });
  const hash = await bcrypt.hash(password, 12);
  const isWorqshop = inv.email.toLowerCase().endsWith("@worqshop.io");
  const [inserted] = await db.insert(users).values({
    email: inv.email,
    passwordHash: hash,
    name: name || inv.email,
    mustChangePassword: "false",
    isAdmin: isWorqshop,
    // Mail-Verify ist Pflicht — Login-Action blockt sonst.
    emailVerifiedAt: null
  }).returning({ id: users.id });
  await db.update(invites).set({ usedAt: new Date() }).where(eq(invites.id, inv.id));

  // Verify-Token + Mail (best-effort). User muss Bestaetigungs-Link klicken,
  // bevor er sich einloggen kann.
  try {
    await issueVerificationToken(inserted.id, inv.email);
  } catch (e) {
    console.error("[invite-accept] verification token issuance failed", e);
    // Trotzdem weiter — User kann auf /verify-email Resend klicken.
  }

  return NextResponse.json({ ok: true, email: inv.email, verifyRequired: true });
}

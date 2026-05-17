"use server";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, emailVerificationTokens } from "@/db/schema";
import { auth } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/n8n";
import { getLocaleFromCookies, t } from "@/lib/i18n";

const TOKEN_TTL_HOURS = 24;

// Helper: Verification-Token erstellen + per Mail verschicken.
// Wird sowohl von register/actions.ts als auch von resendVerificationAction genutzt.
export async function issueVerificationToken(userId: string, email: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
  await db.insert(emailVerificationTokens).values({ userId, token, expiresAt });

  const base = process.env.APP_PUBLIC_BASE || "https://syn.worqshop.io";
  const verifyUrl = `${base}/verify-email?token=${token}`;
  console.log(`[verify-email] Bestaetigungs-Link fuer ${email}: ${verifyUrl}`);

  sendVerificationEmail({ recipientEmail: email, verifyUrl }).catch(err => {
    console.error("[verify-email] mail send failed", err);
  });

  return verifyUrl;
}

// Resend-Action: aktuell eingeloggter User; falls bereits verifiziert: no-op.
export async function resendVerificationAction(_prev: unknown, _formData: FormData) {
  const locale = await getLocaleFromCookies();
  const session = await auth();
  if (!session?.user?.email) {
    return { sent: false, error: t("verify.notLoggedIn", locale) };
  }

  try {
    const [u] = await db
      .select({ id: users.id, email: users.email, emailVerifiedAt: users.emailVerifiedAt })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (!u) {
      return { sent: false, error: t("verify.notLoggedIn", locale) };
    }
    if (u.emailVerifiedAt) {
      // Bereits verifiziert — trotzdem "sent" anzeigen (neutraler State).
      return { sent: true, error: null };
    }

    await issueVerificationToken(u.id, u.email);
    return { sent: true, error: null };
  } catch (e) {
    console.error("[resend-verification] failed", e);
    return { sent: false, error: t("verify.resendFailed", locale) };
  }
}

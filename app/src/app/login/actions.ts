"use server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { getLocaleFromCookies, t } from "@/lib/i18n";
import { ratelimit, getClientIp } from "@/lib/ratelimit";

type LoginState = { error: string | null; unverifiedEmail?: string; restoreOffered?: boolean; restoreEmail?: string };

export async function loginAction(_prev: unknown, formData: FormData): Promise<LoginState> {
  const locale = await getLocaleFromCookies();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  // Rate-Limit per-IP+Email: 10 Versuche pro 5 Min (anti-Brute-Force)
  const ip = await getClientIp();
  const rl = await ratelimit(`login:${ip}:${email}`, 10, 300);
  if (!rl.ok) return { error: t("ratelimit.tooMany", locale) };

  const password = String(formData.get("password") || "");

  // Pre-check: User existiert + Passwort stimmt? Wenn nicht: generischer Fehler.
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) {
    return { error: t("login.invalid", locale) };
  }

  // Account in Loesch-Status?
  if (u.deletionRequestedAt) {
    console.warn(`[login] Blocked — account ${email} flagged for deletion`);
    return { error: t("login.deleted_with_restore", locale), restoreOffered: true, restoreEmail: email };
  }

  // Email noch nicht bestaetigt?
  if (!u.emailVerifiedAt) {
    return { error: t("login.unverified", locale), unverifiedEmail: email };
  }

  // Alles OK — NextAuth signIn (throws NEXT_REDIRECT bei Erfolg).
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/app/dashboard"
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: t("login.invalid", locale) };
    throw e;
  }
  return { error: null };
}

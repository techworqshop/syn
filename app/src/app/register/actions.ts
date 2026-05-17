"use server";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { signIn } from "@/lib/auth";
import { getLocaleFromCookies, t } from "@/lib/i18n";
import { issueVerificationToken } from "@/app/verify-email/actions";

// Public Sign-Up:
// - Email + Passwort + Bestaetigung + AGB
// - @worqshop.io -> Auto-Admin + Auto-Verified (kein Mail-Verify noetig)
// - Andere User -> emailVerifiedAt bleibt NULL, Verify-Token + Mail,
//   Redirect zu /verify-email statt /app/dashboard
export async function registerAction(_prev: unknown, formData: FormData) {
  const locale = await getLocaleFromCookies();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const password2 = String(formData.get("password2") || "");
  const agb = formData.get("agb");

  if (!email || !email.includes("@")) {
    return { error: t("register.invalidEmail", locale) };
  }
  if (password.length < 8) {
    return { error: t("register.pwdTooShort", locale) };
  }
  if (password !== password2) {
    return { error: t("register.pwdMismatch", locale) };
  }
  if (!agb) {
    return { error: t("register.agbRequired", locale) };
  }

  // Sign-Up-Gate: aktuell nur @worqshop.io. Externe User werden
  // bewusst nicht zugelassen, bis Beta-Launch.
  if (!email.endsWith("@worqshop.io")) {
    return { error: t("register.restrictedToWorqshop", locale) };
  }

  // Doppelte Email?
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return { error: t("register.emailTaken", locale) };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const isWorqshop = email.endsWith("@worqshop.io");

  let userId: string;
  try {
    const [inserted] = await db.insert(users).values({
      email,
      passwordHash,
      isAdmin: isWorqshop,
      mustChangePassword: "false",
      emailVerifiedAt: isWorqshop ? new Date() : null
    }).returning({ id: users.id });
    userId = inserted.id;
  } catch (e) {
    console.error("[register] insert failed", e);
    return { error: t("register.failed", locale) };
  }

  // Nicht-Worqshop: Verify-Token erstellen + Mail verschicken (best-effort)
  if (!isWorqshop) {
    try {
      await issueVerificationToken(userId, email);
    } catch (e) {
      console.error("[register] verification token issuance failed", e);
      // Trotzdem weiter — User kann auf /verify-email "Resend" klicken
    }
  }

  // Auto-Login + Redirect:
  // - Worqshop -> Dashboard (verified)
  // - Sonst -> /verify-email (pending state)
  await signIn("credentials", {
    email,
    password,
    redirectTo: isWorqshop ? "/app/dashboard" : "/verify-email"
  });

  // Sollte nicht erreicht werden (signIn throws NEXT_REDIRECT).
  redirect("/login");
}

"use server";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { signIn } from "@/lib/auth";
import { getLocaleFromCookies, t } from "@/lib/i18n";

// Public Sign-Up:
// - Email + Passwort + Bestaetigung + AGB
// - @worqshop.io -> Auto-Admin (gleiche Logik wie Invite-Accept)
// - Direkt einloggen nach erfolgreicher Erstellung
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

  // Doppelte Email?
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return { error: t("register.emailTaken", locale) };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const isWorqshop = email.endsWith("@worqshop.io");

  try {
    await db.insert(users).values({
      email,
      passwordHash,
      isAdmin: isWorqshop,
      mustChangePassword: "false"
    });
  } catch (e) {
    console.error("[register] insert failed", e);
    return { error: t("register.failed", locale) };
  }

  // Auto-Login: signIn() wirft NEXT_REDIRECT bei Erfolg — durchlassen.
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/app/dashboard"
  });

  // Sollte nicht erreicht werden, aber falls signIn nicht redirected:
  redirect("/login");
}

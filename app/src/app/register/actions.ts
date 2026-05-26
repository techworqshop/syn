"use server";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { invites, users } from "@/db/schema";
import { getLocaleFromCookies, t } from "@/lib/i18n";
import { issueVerificationToken } from "@/app/verify-email/actions";
import { ratelimit, getClientIp } from "@/lib/ratelimit";

// Test-Accounts die NIE Auto-Admin werden, auch wenn @worqshop.io.
const NEVER_AUTO_ADMIN = new Set(["lukasz+1@worqshop.io"]);

// Public Sign-Up:
// - Email + Passwort + Bestaetigung + AGB
// - @worqshop.io -> Auto-Admin + Auto-Verified (kein Mail-Verify noetig)
// - Andere User -> emailVerifiedAt bleibt NULL, Verify-Token + Mail,
//   Redirect zu /verify-email statt /app/dashboard
export async function registerAction(_prev: unknown, formData: FormData) {
  const locale = await getLocaleFromCookies();
  // Rate-Limit per-IP: 5 Registrierungen pro 10 Min (anti-Mass-Signup)
  const ip = await getClientIp();
  const rl = await ratelimit(`register:${ip}`, 5, 600);
  if (!rl.ok) return { error: t("ratelimit.tooMany", locale) };

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

  // Sign-Up-Gate: erlaubte Domains. Externe Domains koennen hier
  // explizit freigeschaltet werden (Tester / Beta).
  const ALLOWED_DOMAINS = ["@worqshop.io", "@connectima.net", "@funktio.ai"];
  const ALLOWED_EMAILS = ["johannes@funktio.ai"];
  if (!ALLOWED_DOMAINS.some(d => email.endsWith(d)) && !ALLOWED_EMAILS.includes(email)) {
    return { error: t("register.restrictedToWorqshop", locale) };
  }

  // Doppelte Email?
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return { error: t("register.emailTaken", locale) };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const isWorqshop = email.endsWith("@worqshop.io");
  const allowAutoAdmin = isWorqshop && !NEVER_AUTO_ADMIN.has(email);

  let userId: string;
  try {
    const [inserted] = await db.insert(users).values({
      email,
      passwordHash,
      isAdmin: allowAutoAdmin,
      mustChangePassword: "false",
      // Production-Flow: JEDER muss Email bestaetigen — keine Shortcuts.
      emailVerifiedAt: null
    }).returning({ id: users.id });
    userId = inserted.id;
  } catch (e) {
    console.error("[register] insert failed", e);
    return { error: t("register.failed", locale) };
  }

  // Consume matching pending invite for this email so it doesn't keep showing as 'open'.
  try {
    await db.update(invites)
      .set({ usedAt: new Date() })
      .where(and(eq(invites.email, email), isNull(invites.usedAt)));
  } catch (e) {
    console.warn("[register] invite consume failed (continuing):", e);
  }

  // Verify-Token erstellen + Mail verschicken (best-effort)
  try {
    await issueVerificationToken(userId, email);
  } catch (e) {
    console.error("[register] verification token issuance failed", e);
    // Trotzdem weiter — User kann auf der Verify-Page "Resend" klicken
  }

  // KEIN Auto-Login. User soll erst die Mail bestaetigen, dann selbst einloggen.
  // Redirect zur Verify-Email-Page mit der Adresse als Hint, damit die Pending-Page
  // dem User zeigt wo der Link hingeschickt wurde.
  redirect(`/verify-email?email=${encodeURIComponent(email)}`);
}

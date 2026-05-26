"use server";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, users, emailChangeTokens } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { signOut } from "@/lib/auth";
import { sendEmailChangeEmail } from "@/lib/n8n";
import { getLocaleFromCookies, t } from "@/lib/i18n";

const EMAIL_CHANGE_TTL_HOURS = 1;

// ───── Profile update (name only — email change goes through its own flow)
export async function updateProfileAction(_prev: unknown, formData: FormData) {
  const locale = await getLocaleFromCookies();
  const u = await requireUser();
  const name = String(formData.get("name") || "").trim();
  if (name.length > 120) return { ok: false, error: t("settings.profile.name_too_long", locale) };
  try {
    await db.update(users).set({ name: name || null, updatedAt: new Date() }).where(eq(users.id, u.id));
    return { ok: true, error: null };
  } catch (e) {
    console.error("[settings/updateProfile]", e);
    return { ok: false, error: t("settings.generic_error", locale) };
  }
}

// ───── Password change (logged-in user)
export async function changePasswordAction(_prev: unknown, formData: FormData) {
  const locale = await getLocaleFromCookies();
  const u = await requireUser();
  const current = String(formData.get("currentPassword") || "");
  const next = String(formData.get("newPassword") || "");
  const next2 = String(formData.get("newPassword2") || "");

  if (next.length < 8) return { ok: false, error: t("register.pwdTooShort", locale) };
  if (next !== next2) return { ok: false, error: t("register.pwdMismatch", locale) };

  const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, u.id)).limit(1);
  if (!row) return { ok: false, error: t("settings.generic_error", locale) };

  const ok = await bcrypt.compare(current, row.passwordHash);
  if (!ok) return { ok: false, error: t("settings.password.wrong_current", locale) };

  try {
    const newHash = await bcrypt.hash(next, 10);
    await db.update(users).set({ passwordHash: newHash, mustChangePassword: "false", updatedAt: new Date() }).where(eq(users.id, u.id));
    return { ok: true, error: null };
  } catch (e) {
    console.error("[settings/changePassword]", e);
    return { ok: false, error: t("settings.generic_error", locale) };
  }
}

// ───── Email-Change-Request: schickt einen Verify-Link an die NEUE Adresse.
// Erst nach Klick auf den Link wird users.email umgeschwenkt.
export async function requestEmailChangeAction(_prev: unknown, formData: FormData) {
  const locale = await getLocaleFromCookies();
  const u = await requireUser();
  const newEmail = String(formData.get("newEmail") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!newEmail || !newEmail.includes("@")) {
    return { sent: false, error: t("register.invalidEmail", locale), newEmail: null };
  }
  if (newEmail === u.email.toLowerCase()) {
    return { sent: false, error: t("settings.email.same_as_current", locale), newEmail: null };
  }

  // Passwort verifizieren (extra Sicherheit, weil das ne sensitive Aktion ist)
  const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, u.id)).limit(1);
  if (!row || !(await bcrypt.compare(password, row.passwordHash))) {
    return { sent: false, error: t("settings.email.wrong_password", locale), newEmail: null };
  }

  // Bereits vergeben?
  const [conflict] = await db.select({ id: users.id }).from(users).where(eq(users.email, newEmail)).limit(1);
  if (conflict) {
    return { sent: false, error: t("register.emailTaken", locale), newEmail: null };
  }

  // Token erstellen + Mail verschicken AN DIE NEUE ADRESSE
  try {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + EMAIL_CHANGE_TTL_HOURS * 60 * 60 * 1000);
    await db.insert(emailChangeTokens).values({ userId: u.id, newEmail, token, expiresAt });

    const base = process.env.APP_PUBLIC_BASE || "https://syn.worqshop.io";
    const confirmUrl = `${base}/confirm-email-change?token=${token}`;
    console.log(`[settings/requestEmailChange] Confirm-Link fuer ${newEmail}: ${confirmUrl}`);

    sendEmailChangeEmail({ recipientEmail: newEmail, confirmUrl, oldEmail: u.email }).catch(err => {
      console.error("[settings/requestEmailChange] mail send failed", err);
    });

    return { sent: true, error: null, newEmail };
  } catch (e) {
    console.error("[settings/requestEmailChange]", e);
    return { sent: false, error: t("settings.generic_error", locale), newEmail: null };
  }
}

// ───── Account-Deletion-Request: setzt timestamp + logged user out.
// Login wird ab da blockiert (Reaktivierung manuell via Admin/Mail).
export async function requestAccountDeletionAction(_prev: unknown, formData: FormData) {
  const locale = await getLocaleFromCookies();
  const u = await requireUser();
  const confirm = String(formData.get("confirm") || "");
  const password = String(formData.get("password") || "");

  if (confirm !== "LOESCHEN") {
    return { ok: false, error: t("settings.danger.confirm_wrong", locale) };
  }

  const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, u.id)).limit(1);
  if (!row || !(await bcrypt.compare(password, row.passwordHash))) {
    return { ok: false, error: t("settings.email.wrong_password", locale) };
  }

  // Block if a paid subscription is still active
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, u.id)).limit(1);
  if (sub && (sub.status === "active" || sub.status === "in_trial")) {
    return { ok: false, error: t("settings.danger.block_active_sub", locale) };
  }

  try {
    await db.update(users).set({ deletionRequestedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, u.id));
    console.log(`[settings/requestAccountDeletion] User ${u.email} flagged for deletion`);
  } catch (e) {
    console.error("[settings/requestAccountDeletion]", e);
    return { ok: false, error: t("settings.generic_error", locale) };
  }

  // Logout — danach kommt der User nicht mehr rein (Auth-Layer rejected).
  await signOut({ redirectTo: "/login?reason=deleted" });

  // unreachable
  return { ok: true, error: null };
}

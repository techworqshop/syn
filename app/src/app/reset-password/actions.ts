"use server";
import bcrypt from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/db/schema";
import { getLocaleFromCookies, t } from "@/lib/i18n";

// Reset-Action:
// - Token validieren (existiert, nicht abgelaufen, nicht used).
// - Passwoerter matchen + min 8 Zeichen.
// - User-Passwort hashen + updaten, Token als used markieren.
export async function resetPasswordAction(_prev: unknown, formData: FormData) {
  const locale = await getLocaleFromCookies();
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const password2 = String(formData.get("password2") || "");

  if (password.length < 8) return { ok: false, error: t("register.pwdTooShort", locale) };
  if (password !== password2) return { ok: false, error: t("register.pwdMismatch", locale) };
  if (!token) return { ok: false, error: t("reset.invalidToken", locale) };

  const [row] = await db
    .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expiresAt, new Date()),
        isNull(passwordResetTokens.usedAt)
      )
    )
    .limit(1);

  if (!row) return { ok: false, error: t("reset.invalidToken", locale) };

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await db.update(users)
      .set({ passwordHash, mustChangePassword: "false", updatedAt: new Date() })
      .where(eq(users.id, row.userId));
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, row.id));
  } catch (e) {
    console.error("[reset-password] update failed", e);
    return { ok: false, error: t("reset.failed", locale) };
  }

  return { ok: true, error: null };
}

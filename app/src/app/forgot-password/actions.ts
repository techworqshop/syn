"use server";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/db/schema";
import { sendPasswordResetEmail } from "@/lib/n8n";
import { getLocaleFromCookies, t } from "@/lib/i18n";

const TOKEN_TTL_MIN = 30;

// Request-Reset:
// - User-Lookup per Email; existiert er nicht -> trotzdem "sent" zurueck
//   (kein User-Enumeration-Leak — die Antwort haengt nur von der eingegebenen
//   Mail ab, nicht vom DB-Lookup-Ergebnis).
// - Sonst: Token (32 byte hex), TTL 30 min, in DB.
// - Mail via n8n verschicken; falls n8n offline, Link zumindest in Logs.
// - Email kommt zurueck in den State, damit der Sent-State sie anzeigen
//   (UND ein Resend triggern) kann.
export async function requestResetAction(_prev: unknown, formData: FormData) {
  const locale = await getLocaleFromCookies();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { sent: false, email: null, error: t("register.invalidEmail", locale) };
  }

  try {
    const [u] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, email)).limit(1);
    if (u) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000);
      await db.insert(passwordResetTokens).values({ userId: u.id, token, expiresAt });

      const base = process.env.APP_PUBLIC_BASE || "https://syn.worqshop.io";
      const resetUrl = `${base}/reset-password?token=${token}`;
      console.log(`[forgot-password] Reset-Link fuer ${u.email}: ${resetUrl}`);

      // n8n-Mail (best-effort, blockt nicht die UI)
      sendPasswordResetEmail({ recipientEmail: u.email, resetUrl }).catch(err => {
        console.error("[forgot-password] mail send failed", err);
      });
    }
  } catch (e) {
    console.error("[forgot-password] action failed", e);
    // Trotzdem "sent" zurueck — keine internen Fehler an User leaken.
  }

  // Immer "sent" zurueck — Anti-Enumeration. Email wird gespiegelt.
  return { sent: true, email, error: null };
}

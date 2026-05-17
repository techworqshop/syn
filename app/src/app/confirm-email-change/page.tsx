import { redirect } from "next/navigation";
import Link from "next/link";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, emailChangeTokens } from "@/db/schema";
import AuthShell from "@/components/auth/AuthShell";
import { getLocaleFromCookies, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ token?: string }>;

export default async function ConfirmEmailChangePage({ searchParams }: { searchParams: SearchParams }) {
  const locale = await getLocaleFromCookies();
  const { token = "" } = await searchParams;

  if (!token) {
    return (
      <AuthShell locale={locale}>
        <FailureState locale={locale} />
      </AuthShell>
    );
  }

  const [row] = await db.select({ id: emailChangeTokens.id, userId: emailChangeTokens.userId, newEmail: emailChangeTokens.newEmail, usedAt: emailChangeTokens.usedAt })
    .from(emailChangeTokens)
    .where(and(eq(emailChangeTokens.token, token), gt(emailChangeTokens.expiresAt, new Date())))
    .limit(1);

  if (!row) {
    return (
      <AuthShell locale={locale}>
        <FailureState locale={locale} />
      </AuthShell>
    );
  }

  // Bereits used? Trotzdem Success-State zeigen (idempotent).
  if (!row.usedAt) {
    // Existiert die neue Email schon (Race-Condition zwischen Request und Confirm)?
    const [conflict] = await db.select({ id: users.id }).from(users).where(eq(users.email, row.newEmail)).limit(1);
    if (conflict && conflict.id !== row.userId) {
      return (
        <AuthShell locale={locale}>
          <ConflictState locale={locale} />
        </AuthShell>
      );
    }
    await db.update(users).set({ email: row.newEmail, updatedAt: new Date() }).where(eq(users.id, row.userId));
    await db.update(emailChangeTokens).set({ usedAt: new Date() }).where(eq(emailChangeTokens.id, row.id));
  }

  return (
    <AuthShell locale={locale}>
      <SuccessState locale={locale} newEmail={row.newEmail} />
    </AuthShell>
  );
}

function FailureState({ locale }: { locale: "de" | "en" }) {
  return (
    <>
      <h1 className="text-[26px] font-semibold tracking-tight mb-2" style={{ color: "#1F2420" }}>
        {t("confirmEmail.failTitle", locale)}
      </h1>
      <p className="text-sm mb-7 leading-relaxed" style={{ color: "#4A4640" }}>
        {t("confirmEmail.failBody", locale)}
      </p>
      <Link href="/app/settings" className="block text-center text-white rounded-[11px] py-3 px-4 text-sm font-medium" style={{ background: "linear-gradient(180deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)" }}>
        {t("confirmEmail.gotoSettings", locale)}
      </Link>
    </>
  );
}

function ConflictState({ locale }: { locale: "de" | "en" }) {
  return (
    <>
      <h1 className="text-[26px] font-semibold tracking-tight mb-2" style={{ color: "#1F2420" }}>
        {t("confirmEmail.conflictTitle", locale)}
      </h1>
      <p className="text-sm mb-7 leading-relaxed" style={{ color: "#4A4640" }}>
        {t("confirmEmail.conflictBody", locale)}
      </p>
      <Link href="/app/settings" className="block text-center text-white rounded-[11px] py-3 px-4 text-sm font-medium" style={{ background: "linear-gradient(180deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)" }}>
        {t("confirmEmail.gotoSettings", locale)}
      </Link>
    </>
  );
}

function SuccessState({ locale, newEmail }: { locale: "de" | "en"; newEmail: string }) {
  return (
    <>
      <div className="flex justify-center mb-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(58,126,88,0.12)", border: "1px solid rgba(58,126,88,0.25)" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3A7E58" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
      </div>
      <h1 className="text-[26px] font-semibold tracking-tight mb-2 text-center" style={{ color: "#1F2420" }}>
        {t("confirmEmail.successTitle", locale)}
      </h1>
      <p className="text-sm mb-7 leading-relaxed text-center" style={{ color: "#4A4640" }}>
        {t("confirmEmail.successBody1", locale)}{" "}
        <span className="font-medium" style={{ color: "#1F2420" }}>{newEmail}</span>
        {t("confirmEmail.successBody2", locale)}
      </p>
      <Link href="/login" className="block text-center text-white rounded-[11px] py-3 px-4 text-sm font-medium" style={{ background: "linear-gradient(180deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)" }}>
        {t("confirmEmail.relogin", locale)}
      </Link>
    </>
  );
}

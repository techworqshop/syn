import Link from "next/link";
import { and, eq, gt, isNull } from "drizzle-orm";
import AuthShell from "@/components/auth/AuthShell";
import ResetForm from "./ResetForm";
import { db } from "@/lib/db";
import { passwordResetTokens } from "@/db/schema";
import { getLocaleFromCookies, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ token?: string }>;

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const locale = await getLocaleFromCookies();
  const { token = "" } = await searchParams;

  // Token early-validate (UI-side; finale Validation passiert in der Action)
  let valid = false;
  if (token) {
    const [row] = await db
      .select({ id: passwordResetTokens.id })
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date()),
          isNull(passwordResetTokens.usedAt)
        )
      )
      .limit(1);
    valid = !!row;
  }

  return (
    <AuthShell
      locale={locale}
      navRight={
        <Link href="/login" className="text-sm hover:text-stone-900 transition-colors hidden sm:flex items-center gap-1.5" style={{ color: "#4A4640" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          <b className="font-medium" style={{ color: "#1F2420" }}>{t("recovery.backToLogin", locale)}</b>
        </Link>
      }
    >
      {valid ? (
        <ResetForm locale={locale} token={token} />
      ) : (
        <InvalidTokenState locale={locale} />
      )}
    </AuthShell>
  );
}

function InvalidTokenState({ locale }: { locale: "de" | "en" }) {
  return (
    <>
      <h1 className="text-[26px] font-semibold tracking-tight mb-1.5" style={{ color: "#1F2420" }}>
        {t("reset.invalidTitle", locale)}
      </h1>
      <p className="text-sm mb-7" style={{ color: "#7A7268" }}>
        {t("reset.invalidBody", locale)}
      </p>
      <Link
        href="/forgot-password"
        className="block w-full text-center text-white border-none rounded-md py-3.5 px-4 text-sm font-medium"
        style={{ background: "linear-gradient(180deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)" }}
      >
        {t("reset.requestAgain", locale)}
      </Link>
    </>
  );
}

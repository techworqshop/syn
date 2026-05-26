import { redirect } from "next/navigation";
import Link from "next/link";
import { and, eq, gt, isNull } from "drizzle-orm";
import AuthShell from "@/components/auth/AuthShell";
import VerifyPending from "./VerifyPending";
import { db } from "@/lib/db";
import { users, emailVerificationTokens } from "@/db/schema";
import { auth, signOut } from "@/lib/auth";
import { getLocaleFromCookies, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ token?: string; verified?: string; email?: string }>;

export default async function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {
  const locale = await getLocaleFromCookies();
  const { token = "", verified, email: emailParam } = await searchParams;

  // ───── 1) Token-Klick aus Mail: Validieren + User markieren
  if (token) {
    const [row] = await db
      .select({
        id: emailVerificationTokens.id,
        userId: emailVerificationTokens.userId,
        usedAt: emailVerificationTokens.usedAt
      })
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.token, token),
          gt(emailVerificationTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (row) {
      // Idempotent: bereits used? Trotzdem als Erfolg darstellen.
      if (!row.usedAt) {
        await db.update(users)
          .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
          .where(eq(users.id, row.userId));
        await db.update(emailVerificationTokens)
          .set({ usedAt: new Date() })
          .where(eq(emailVerificationTokens.id, row.id));
      }
      redirect("/login?verified=1");
    }
    // Ungueltig / abgelaufen: zeige Error-State
    return (
      <AuthShell locale={locale}>
        <InvalidState locale={locale} />
      </AuthShell>
    );
  }

  // ───── 2) Erfolgs-State (nach Token-Klick redirected)
  if (verified === "1") {
    return (
      <AuthShell locale={locale}>
        <SuccessState locale={locale} />
      </AuthShell>
    );
  }

  // ───── 3) Pending-State: User entweder eingeloggt ODER kommt frisch
  // von der Registrierung (?email=X param, ohne Session).
  const session = await auth();
  const email = emailParam ?? session?.user?.email ?? "";
  const showLogout = !!session?.user;

  return (
    <AuthShell
      locale={locale}
      navRight={
        showLogout ? (
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button type="submit" className="text-sm hover:text-stone-900 transition-colors" style={{ color: "#4A4640" }}>
              {t("verify.logout", locale)}
            </button>
          </form>
        ) : (
          <a href="/login" className="text-sm hover:text-stone-900 transition-colors" style={{ color: "#4A4640" }}>
            {t("auth.login", locale)}
          </a>
        )
      }
    >
      <VerifyPending locale={locale} email={email} hasSession={showLogout} />
    </AuthShell>
  );
}

function InvalidState({ locale }: { locale: "de" | "en" }) {
  return (
    <>
      <h1 className="text-[26px] font-semibold tracking-tight mb-1.5" style={{ color: "#1F2420" }}>
        {t("verify.invalidTitle", locale)}
      </h1>
      <p className="text-sm mb-7 leading-relaxed" style={{ color: "#4A4640" }}>
        {t("verify.invalidBody", locale)}
      </p>
      <Link
        href="/verify-email"
        className="block w-full text-center text-white border-none rounded-md py-3.5 px-4 text-sm font-medium"
        style={{ background: "linear-gradient(180deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)" }}
      >
        {t("verify.requestAgain", locale)}
      </Link>
      <p className="text-center text-sm mt-5" style={{ color: "#7A7268" }}>
        <Link href="/login" className="font-medium hover:underline" style={{ color: "#1F2420" }}>
          {t("auth.login", locale)}
        </Link>
      </p>
    </>
  );
}

function SuccessState({ locale }: { locale: "de" | "en" }) {
  return (
    <>
      <div className="flex justify-center mb-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "rgba(58,126,88,0.12)", border: "1px solid rgba(58,126,88,0.25)" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3A7E58" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>
      <h1 className="text-[26px] font-semibold tracking-tight mb-1.5 text-center" style={{ color: "#1F2420" }}>
        {t("verify.successTitle", locale)}
      </h1>
      <p className="text-sm mb-7 leading-relaxed text-center" style={{ color: "#4A4640" }}>
        {t("verify.successBody", locale)}
      </p>
      <Link
        href="/app/dashboard"
        className="block w-full text-center text-white border-none rounded-md py-3.5 px-4 text-sm font-medium"
        style={{ background: "linear-gradient(180deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)" }}
      >
        {t("verify.toDashboard", locale)}
      </Link>
    </>
  );
}

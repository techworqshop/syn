import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import ForgotForm from "./ForgotForm";
import { getLocaleFromCookies, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const locale = await getLocaleFromCookies();
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
      <ForgotForm locale={locale} />
    </AuthShell>
  );
}

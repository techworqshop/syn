import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import RegisterForm from "./RegisterForm";
import { getLocaleFromCookies, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const locale = await getLocaleFromCookies();
  return (
    <AuthShell
      locale={locale}
      navRight={
        <Link href="/login" className="text-sm hover:text-stone-900 transition-colors hidden sm:flex items-baseline gap-1" style={{ color: "#4A4640" }}>
          <span>{t("auth.alreadyRegistered", locale)}</span>
          <b className="font-medium" style={{ color: "#1F2420" }}>{t("auth.login", locale)}</b>
        </Link>
      }
    >
      <RegisterForm locale={locale} />
    </AuthShell>
  );
}

import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "./LoginForm";
import { getLocaleFromCookies, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ verified?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const locale = await getLocaleFromCookies();
  const { verified } = await searchParams;
  return (
    <AuthShell
      locale={locale}
      navRight={
        <Link href="/register" className="text-sm hover:text-stone-900 transition-colors hidden sm:flex items-baseline gap-1" style={{ color: "#4A4640" }}>
          <span>{t("auth.noAccount", locale)}</span>
          <b className="font-medium" style={{ color: "#1F2420" }}>{t("auth.createAccount", locale)}</b>
        </Link>
      }
    >
      <LoginForm locale={locale} justVerified={verified === "1"} />
    </AuthShell>
  );
}

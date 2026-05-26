import { signOut } from "@/lib/auth";
import { requireUser } from "@/lib/current-user";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getLocaleFromCookies, t } from "@/lib/i18n";
import LanguageSwitch from "@/components/LanguageSwitch";
import { loadQuotaState } from "@/lib/quota";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser().catch(() => null);
  if (!u) redirect("/login");
  const locale = await getLocaleFromCookies();
  const quota = await loadQuotaState(u.id);
  const showChip = quota.hasActiveSub && !quota.bypass;
  const chipColor = quota.remaining === 0 ? "#9F1239" : quota.remaining <= 1 ? "#A77E22" : "#3A7E58";
  return (
    <div className="h-screen flex flex-col">
      <header className="glass border-b border-stone-200 px-6 py-1.5 flex items-center justify-between sticky top-0 z-20">
        <Link href="/app/dashboard" className="flex items-center gap-2 group">
          <img src="/api/assets/syn-avatar" alt="" className="w-6 h-6 rounded-full ring-1 ring-white/10" />
          <span className="font-serif text-xl font-medium tracking-tight" style={{ color: "#1F2420" }}>Syn</span>
        </Link>
        <div className="text-sm text-stone-800 flex items-center gap-4">
          <LanguageSwitch locale={locale} />
          <Link href="/app/help" title={t("nav.help_title", locale)}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-stone-400 text-stone-700 hover:text-rose-700 hover:border-rose-700 transition-colors font-bold">?</Link>
          <span className="hidden sm:inline text-stone-700">{u.email}</span>
          <Link href="/app/billing" className="hidden sm:inline-flex items-center gap-2 text-stone-700 hover:text-rose-700 transition-colors">{locale === "en" ? "Billing" : "Abo"}{showChip && (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white ring-1 ring-stone-300" style={{ color: chipColor }}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: chipColor }} />{quota.slotsInUse}/{quota.totalQuota}</span>)}</Link>
          <Link href="/app/settings" className="hidden sm:inline text-stone-700 hover:text-rose-700 transition-colors">{t("nav.settings", locale)}</Link>
          {u.isAdmin && <Link href="/app/admin/analytics" className="hidden sm:inline text-stone-700 hover:text-rose-700 transition-colors">{t("nav.admin", locale)}</Link>}
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button className="text-stone-700 hover:text-rose-700 transition-colors">{t("nav.logout", locale)}</button>
          </form>
        </div>
      </header>
      <main className="flex-1 flex flex-col min-h-0">{children}</main>
    </div>
  );
}

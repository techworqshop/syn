"use client";
import { useActionState, useEffect, useState } from "react";
import { loginAction } from "./actions";
import { t, COOKIE_NAME, DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import LanguageSwitch from "@/components/LanguageSwitch";

const inp = "w-full px-4 py-2.5 rounded-xl bg-white/80 border border-stone-300 focus:outline-none focus:border-rose-700/60 focus:ring-2 focus:ring-rose-700/10 transition-all placeholder:text-stone-500";

function readLocaleCookie(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const m = document.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const v = m?.[1];
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, { error: null });
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  useEffect(() => { setLocale(readLocaleCookie()); }, []);
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-2">
          <LanguageSwitch locale={locale} />
        </div>
        <form action={action} className="space-y-4 p-8 rounded-2xl border border-stone-200 glass shadow-2xl shadow-black/50">
          <div className="flex items-center justify-center mb-4">
            <img src="/api/assets/syn-avatar" alt="" className="w-14 h-14 rounded-full ring-2 ring-rose-700/30" />
          </div>
          <div className="text-center space-y-1 mb-2">
            <h1 className="text-2xl font-semibold tracking-tight">Syn</h1>
            <p className="text-sm text-stone-500">{t("login.subtitle", locale)}</p>
          </div>
          <input name="email" type="email" required placeholder={t("login.email", locale)} className={inp} />
          <input name="password" type="password" required placeholder={t("login.password", locale)} className={inp} />
          {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
          <button disabled={pending} className="w-full py-2.5 rounded-xl btn-primary disabled:opacity-50 font-medium transition-all shadow-lg shadow-rose-900/30">
            {pending ? "..." : t("login.submit", locale)}
          </button>
        </form>
      </div>
    </main>
  );
}

"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction } from "./actions";
import { t, type Locale } from "@/lib/i18n";
import { authStyles as s } from "@/components/auth/AuthShell";

export default function LoginForm({ locale, justVerified = false }: { locale: Locale; justVerified?: boolean }) {
  const [state, action, pending] = useActionState(loginAction, { error: null as string | null, unverifiedEmail: undefined as string | undefined });
  const [showPwd, setShowPwd] = useState(false);

  return (
    <>
      <h1 className={s.title} style={s.titleColor}>{t("login.title", locale)}</h1>
      <p className={s.sub} style={s.subColor}>{t("login.subtitle2", locale)}</p>

      {justVerified && (
        <div
          className="rounded-[10px] px-4 py-3 mb-5 text-sm leading-relaxed"
          style={{ background: "rgba(58,126,88,0.10)", border: "1px solid rgba(58,126,88,0.30)", color: "#1F2420" }}
        >
          {t("login.verifiedBanner", locale)}
        </div>
      )}

      <form action={action} className="space-y-5">
        <div>
          <label className={s.label} style={s.labelColor} htmlFor="email">{t("login.email", locale)}</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="du@firma.com"
            className={s.input}
            style={s.inputStyle}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={s.label} style={s.labelColor} htmlFor="password">{t("login.password", locale)}</label>
            <Link href="/forgot-password" className={s.forgotLink} style={s.forgotLinkColor}>
              {t("auth.forgot", locale)}
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPwd ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={s.input + " pr-11"}
              style={s.inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-stone-900/5 transition-colors"
              style={{ color: "#7A7268" }}
              aria-label={showPwd ? t("auth.hidePassword", locale) : t("auth.showPassword", locale)}
            >
              {showPwd ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              )}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer text-sm" style={{ color: "#4A4640" }}>
          <input type="checkbox" name="remember" defaultChecked className="w-4 h-4 cursor-pointer" style={{ accentColor: "#4C1D95" }} />
          {t("auth.stayLoggedIn", locale)}
        </label>

        {state?.error && (
          <div>
            <p className="text-sm" style={{ color: "#9F1239" }}>{state.error}</p>
            {state.unverifiedEmail && (
              <a href={`/verify-email?email=${encodeURIComponent(state.unverifiedEmail)}`}
                className="text-xs font-medium hover:underline inline-block mt-1.5"
                style={{ color: "#BE123C" }}>
                {t("login.resendVerify", locale)}
              </a>
            )}
          </div>
        )}

        <button
          disabled={pending}
          className={s.cta + " disabled:opacity-60"}
          style={s.ctaStyle}
        >
          {pending ? "…" : t("login.submit", locale)}
        </button>

        <p className={s.bottomLink} style={s.bottomLinkColor}>
          {t("auth.noAccount", locale)}{" "}
          <Link href="/register" className="font-medium hover:underline" style={{ color: "#1F2420" }}>
            {t("auth.createAccount", locale)}
          </Link>
        </p>
      </form>
    </>
  );
}

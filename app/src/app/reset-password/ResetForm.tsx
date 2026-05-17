"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { resetPasswordAction } from "./actions";
import { t, type Locale } from "@/lib/i18n";
import { authStyles as s } from "@/components/auth/AuthShell";

export default function ResetForm({ locale, token }: { locale: Locale; token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, { ok: false, error: null as string | null });
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  if (state?.ok) {
    return (
      <>
        <h1 className={s.title} style={s.titleColor}>{t("reset.successTitle", locale)}</h1>
        <p className={s.sub} style={s.subColor}>{t("reset.successBody", locale)}</p>
        <Link
          href="/login"
          className={s.cta + " block text-center"}
          style={s.ctaStyle}
        >
          {t("auth.login", locale)}
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className={s.title} style={s.titleColor}>{t("reset.title", locale)}</h1>
      <p className={s.sub} style={s.subColor}>{t("reset.subtitle", locale)}</p>

      <form action={action} className="space-y-5">
        <input type="hidden" name="token" value={token} />

        <div>
          <label className={s.label} style={s.labelColor} htmlFor="password">{t("reset.newPassword", locale)}</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPwd ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
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
              {showPwd ? <EyeOff /> : <EyeOn />}
            </button>
          </div>
          <p className={s.hint} style={s.hintColor}>{t("register.pwdHint", locale)}</p>
        </div>

        <div>
          <label className={s.label} style={s.labelColor} htmlFor="password2">{t("register.passwordRepeat", locale)}</label>
          <div className="relative">
            <input
              id="password2"
              name="password2"
              type={showPwd2 ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••"
              className={s.input + " pr-11"}
              style={s.inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPwd2(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-stone-900/5 transition-colors"
              style={{ color: "#7A7268" }}
              aria-label={showPwd2 ? t("auth.hidePassword", locale) : t("auth.showPassword", locale)}
            >
              {showPwd2 ? <EyeOff /> : <EyeOn />}
            </button>
          </div>
        </div>

        {state?.error && (
          <p className="text-sm" style={{ color: "#9F1239" }}>{state.error}</p>
        )}

        <button
          disabled={pending}
          className={s.cta + " disabled:opacity-60"}
          style={s.ctaStyle}
        >
          {pending ? "…" : t("reset.submit", locale)}
        </button>

        <p className={s.bottomLink} style={s.bottomLinkColor}>
          {t("recovery.remembered", locale)}{" "}
          <Link href="/login" className="font-medium hover:underline" style={{ color: "#1F2420" }}>
            {t("auth.login", locale)}
          </Link>
        </p>
      </form>
    </>
  );
}

function EyeOn() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
}
function EyeOff() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;
}

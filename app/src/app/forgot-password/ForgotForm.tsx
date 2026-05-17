"use client";
import Link from "next/link";
import { useActionState } from "react";
import { requestResetAction } from "./actions";
import { t, type Locale } from "@/lib/i18n";
import { authStyles as s } from "@/components/auth/AuthShell";

export default function ForgotForm({ locale }: { locale: Locale }) {
  const [state, action, pending] = useActionState(requestResetAction, { sent: false, error: null as string | null });

  if (state?.sent) {
    return (
      <>
        <h1 className={s.title} style={s.titleColor}>{t("recovery.sentTitle", locale)}</h1>
        <p className={s.sub} style={s.subColor}>{t("recovery.sentBody", locale)}</p>
        <Link
          href="/login"
          className={s.cta + " block text-center"}
          style={s.ctaStyle}
        >
          {t("recovery.backToLogin", locale)}
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className={s.title} style={s.titleColor}>{t("recovery.title", locale)}</h1>
      <p className={s.sub} style={s.subColor}>{t("recovery.subtitle", locale)}</p>

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

        {state?.error && (
          <p className="text-sm" style={{ color: "#9F1239" }}>{state.error}</p>
        )}

        <button
          disabled={pending}
          className={s.cta + " disabled:opacity-60"}
          style={s.ctaStyle}
        >
          {pending ? "…" : t("recovery.submit", locale)}
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

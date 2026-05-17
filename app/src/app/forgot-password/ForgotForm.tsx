"use client";
import Link from "next/link";
import { useActionState } from "react";
import { requestResetAction } from "./actions";
import { t, type Locale } from "@/lib/i18n";
import { authStyles as s } from "@/components/auth/AuthShell";

type ResetState = { sent: boolean; email: string | null; error: string | null };
const INITIAL_STATE: ResetState = { sent: false, email: null, error: null };

export default function ForgotForm({ locale }: { locale: Locale }) {
  const [state, action, pending] = useActionState(requestResetAction, INITIAL_STATE);

  if (state?.sent) {
    return <SentState locale={locale} email={state.email ?? ""} action={action} pending={pending} />;
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

// Sent-State: Mockup-genau (Postfach-Check Pattern, analog Verify-Email).
function SentState({
  locale, email, action, pending
}: {
  locale: Locale; email: string; action: (formData: FormData) => void; pending: boolean;
}) {
  return (
    <>
      <h1 className={s.title} style={s.titleColor}>{t("recovery.sentTitle", locale)}</h1>
      <p className="text-sm mb-6 leading-relaxed" style={{ color: "#4A4640" }}>
        {t("recovery.sentBody1", locale)}{" "}
        <span className="font-medium" style={{ color: "#1F2420" }}>{email || t("recovery.yourEmail", locale)}</span>{" "}
        {t("recovery.sentBody2", locale)}
      </p>

      {/* Helper-Box mit TTL + Spam-Hinweis */}
      <div
        className="rounded-[10px] px-4 py-3.5 mb-6"
        style={{ background: "#fdfbf4", border: "1px solid rgba(31,36,32,0.10)" }}
      >
        <p className="text-[13px] leading-relaxed" style={{ color: "#4A4640" }}>
          {t("recovery.sentHelper", locale)}
        </p>
      </div>

      {/* Resend: gleiche Action neu triggern. Email wird per hidden input mitgeschickt. */}
      <form action={action}>
        <input type="hidden" name="email" value={email} />
        <button
          type="submit"
          disabled={pending}
          className="w-full text-[#F3EFE2] border-none rounded-[11px] py-3 px-4 text-sm font-medium transition-colors disabled:opacity-60"
          style={{ background: "#1F2420" }}
        >
          {pending ? "…" : t("recovery.resend", locale)}
        </button>
      </form>

      <p className="text-center text-sm mt-5" style={{ color: "#7A7268" }}>
        {t("recovery.remembered", locale)}{" "}
        <Link href="/login" className="font-medium hover:underline" style={{ color: "#1F2420" }}>
          {t("auth.login", locale)}
        </Link>
      </p>
    </>
  );
}

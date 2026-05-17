"use client";
import Link from "next/link";
import { useActionState } from "react";
import { resendVerificationAction } from "./actions";
import { t, type Locale } from "@/lib/i18n";

export default function VerifyPending({ locale, email }: { locale: Locale; email: string }) {
  const [state, action, pending] = useActionState(resendVerificationAction, { sent: false, error: null as string | null });

  return (
    <>
      <h1 className="text-[26px] font-semibold tracking-tight mb-2" style={{ color: "#1F2420" }}>
        {t("verify.title", locale)}
      </h1>
      <p className="text-sm mb-6 leading-relaxed" style={{ color: "#4A4640" }}>
        {t("verify.sub1", locale)}{" "}
        <span className="font-medium" style={{ color: "#1F2420" }}>{email || t("verify.yourEmail", locale)}</span>{" "}
        {t("verify.sub2", locale)}
      </p>

      {/* Helper-Box mit Hinweis */}
      <div
        className="rounded-[10px] px-4 py-3.5 mb-6"
        style={{ background: "#fdfbf4", border: "1px solid rgba(31,36,32,0.10)" }}
      >
        <p className="text-[13px] leading-relaxed" style={{ color: "#4A4640" }}>
          {t("verify.helper", locale)}
        </p>
      </div>

      <form action={action}>
        <button
          type="submit"
          disabled={pending || state?.sent}
          className="w-full text-[#F3EFE2] border-none rounded-[11px] py-3 px-4 text-sm font-medium transition-colors disabled:opacity-60"
          style={{ background: state?.sent ? "#3A7E58" : "#1F2420" }}
        >
          {pending ? "…" : state?.sent ? t("verify.resent", locale) : t("verify.resend", locale)}
        </button>
      </form>

      {state?.error && (
        <p className="text-sm mt-3" style={{ color: "#9F1239" }}>{state.error}</p>
      )}

      <p className="text-center text-sm mt-5" style={{ color: "#7A7268" }}>
        {t("verify.wrongAddress", locale)}{" "}
        <Link href="/register" className="font-medium hover:underline" style={{ color: "#1F2420" }}>
          {t("verify.registerDifferent", locale)}
        </Link>
      </p>
    </>
  );
}

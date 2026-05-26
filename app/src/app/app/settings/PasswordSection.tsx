"use client";
import { useActionState, useState } from "react";
import { changePasswordAction } from "./actions";
import { t, type Locale } from "@/lib/i18n";
import SettingsSection from "./SettingsSection";

export default function PasswordSection({ locale }: { locale: Locale }) {
  const [state, action, pending] = useActionState(changePasswordAction, { ok: false, error: null as string | null });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  return (
    <SettingsSection title={t("settings.password.title", locale)}>
      <form action={action} className="space-y-4" key={state?.ok ? "ok" : "form"}>
        <PwdField name="currentPassword" label={t("settings.password.current", locale)} show={showOld} setShow={setShowOld} locale={locale} />
        <PwdField name="newPassword" label={t("settings.password.new", locale)} show={showNew} setShow={setShowNew} locale={locale} minLength={8} hint={t("register.pwdHint", locale)} />
        <PwdField name="newPassword2" label={t("register.passwordRepeat", locale)} show={showNew} setShow={setShowNew} locale={locale} minLength={8} hideToggle />
        {state?.error && <p className="text-sm" style={{ color: "#9F1239" }}>{state.error}</p>}
        {state?.ok && <p className="text-sm" style={{ color: "#3A7E58" }}>{t("settings.password.changed", locale)}</p>}
        <button disabled={pending} className="text-white rounded-md py-2.5 px-5 text-sm font-medium disabled:opacity-60" style={{ background: "linear-gradient(180deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)" }}>
          {pending ? "…" : t("settings.password.save", locale)}
        </button>
      </form>
    </SettingsSection>
  );
}

function PwdField({ name, label, show, setShow, locale, minLength, hint, hideToggle }: { name: string; label: string; show: boolean; setShow: (v: boolean) => void; locale: Locale; minLength?: number; hint?: string; hideToggle?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "#4A4640", letterSpacing: "0.02em" }}>{label}</label>
      <div className="relative">
        <input name={name} type={show ? "text" : "password"} required minLength={minLength} className={`w-full px-3.5 py-3 rounded-md text-sm outline-none focus:border-violet-700 ${hideToggle ? "" : "pr-11"}`} style={{ background: "#fdfbf4", border: "1px solid rgba(31,36,32,0.15)", color: "#1F2420" }} />
        {!hideToggle && (
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? t("auth.hidePassword", locale) : t("auth.showPassword", locale)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5" style={{ color: "#7A7268" }}>
            {show ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
          </button>
        )}
      </div>
      {hint && <p className="text-[11.5px] mt-1.5" style={{ color: "#7A7268" }}>{hint}</p>}
    </div>
  );
}

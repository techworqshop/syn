"use client";
import { useActionState, useState } from "react";
import { requestEmailChangeAction } from "./actions";
import { t, type Locale } from "@/lib/i18n";
import SettingsSection from "./SettingsSection";

export default function EmailSection({ locale, currentEmail }: { locale: Locale; currentEmail: string }) {
  const [state, action, pending] = useActionState(requestEmailChangeAction, { sent: false, error: null as string | null, newEmail: null as string | null });
  const [open, setOpen] = useState(false);

  if (state?.sent) {
    return (
      <SettingsSection title={t("settings.email.title", locale)}>
        <p className="text-sm leading-relaxed mb-3" style={{ color: "#4A4640" }}>
          {t("settings.email.sent_body1", locale)} <span className="font-medium" style={{ color: "#1F2420" }}>{state.newEmail}</span>{t("settings.email.sent_body2", locale)}
        </p>
        <p className="text-[12.5px] leading-relaxed" style={{ color: "#7A7268" }}>{t("settings.email.sent_hint", locale)}</p>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection title={t("settings.email.title", locale)}>
      <p className="text-sm mb-4" style={{ color: "#4A4640" }}>
        {t("settings.email.current_label", locale)}{" "}
        <span className="font-medium" style={{ color: "#1F2420" }}>{currentEmail}</span>
      </p>
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-sm font-medium hover:underline" style={{ color: "#BE123C" }}>
          {t("settings.email.change_cta", locale)}
        </button>
      ) : (
        <form action={action} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#4A4640", letterSpacing: "0.02em" }}>{t("settings.email.new_email", locale)}</label>
            <input name="newEmail" type="email" required placeholder="neu@firma.com" className="w-full px-3.5 py-3 rounded-[10px] text-sm outline-none focus:border-violet-700" style={{ background: "#fdfbf4", border: "1px solid rgba(31,36,32,0.15)", color: "#1F2420" }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#4A4640", letterSpacing: "0.02em" }}>{t("settings.email.current_password", locale)}</label>
            <input name="password" type="password" required className="w-full px-3.5 py-3 rounded-[10px] text-sm outline-none focus:border-violet-700" style={{ background: "#fdfbf4", border: "1px solid rgba(31,36,32,0.15)", color: "#1F2420" }} />
            <p className="text-[11.5px] mt-1.5" style={{ color: "#7A7268" }}>{t("settings.email.pw_hint", locale)}</p>
          </div>
          {state?.error && <p className="text-sm" style={{ color: "#9F1239" }}>{state.error}</p>}
          <div className="flex gap-2.5">
            <button disabled={pending} className="text-white rounded-[11px] py-2.5 px-5 text-sm font-medium transition-all disabled:opacity-60" style={{ background: "linear-gradient(180deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)" }}>
              {pending ? "…" : t("settings.email.send_link", locale)}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-sm" style={{ color: "#7A7268" }}>{t("settings.cancel", locale)}</button>
          </div>
        </form>
      )}
    </SettingsSection>
  );
}

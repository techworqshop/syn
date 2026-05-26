"use client";
import { useActionState, useState } from "react";
import { updateProfileAction } from "./actions";
import { t, type Locale } from "@/lib/i18n";
import SettingsSection from "./SettingsSection";

export default function ProfileSection({ locale, email, name }: { locale: Locale; email: string; name: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, { ok: false, error: null as string | null });
  const [n, setN] = useState(name);
  return (
    <SettingsSection title={t("settings.profile.title", locale)}>
      <form action={action} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "#4A4640", letterSpacing: "0.02em" }}>{t("settings.profile.email", locale)}</label>
          <input value={email} readOnly className="w-full px-3.5 py-3 rounded-md text-sm cursor-not-allowed" style={{ background: "#fdfbf4", border: "1px solid rgba(31,36,32,0.10)", color: "#7A7268" }} />
          <p className="text-[11.5px] mt-1.5" style={{ color: "#7A7268" }}>{t("settings.profile.email_hint", locale)}</p>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "#4A4640", letterSpacing: "0.02em" }}>{t("settings.profile.name", locale)}</label>
          <input name="name" value={n} onChange={e => setN(e.target.value)} placeholder={t("settings.profile.name_placeholder", locale)} className="w-full px-3.5 py-3 rounded-md text-sm outline-none transition-colors focus:border-violet-700" style={{ background: "#fdfbf4", border: "1px solid rgba(31,36,32,0.15)", color: "#1F2420" }} />
        </div>
        {state?.error && <p className="text-sm" style={{ color: "#9F1239" }}>{state.error}</p>}
        {state?.ok && <p className="text-sm" style={{ color: "#3A7E58" }}>{t("settings.profile.saved", locale)}</p>}
        <button disabled={pending || n === name} className="text-white rounded-md py-2.5 px-5 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: "linear-gradient(180deg, #4C1D95 0%, #9F1239 55%, #BE123C 100%)" }}>
          {pending ? "…" : t("settings.profile.save", locale)}
        </button>
      </form>
    </SettingsSection>
  );
}

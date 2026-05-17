"use client";
import { useActionState, useState } from "react";
import { requestAccountDeletionAction } from "./actions";
import { t, type Locale } from "@/lib/i18n";
import SettingsSection from "./SettingsSection";

export default function DangerZone({ locale, email }: { locale: Locale; email: string }) {
  const [state, action, pending] = useActionState(requestAccountDeletionAction, { ok: false, error: null as string | null });
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const expected = "LOESCHEN";
  return (
    <SettingsSection title={t("settings.danger.title", locale)} stripeVariant="danger">
      <p className="text-sm leading-relaxed mb-4" style={{ color: "#4A4640" }}>{t("settings.danger.body", locale)}</p>
      {!open ? (
        <button onClick={() => setOpen(true)} className="rounded-[10px] py-2 px-4 text-sm font-medium transition-colors hover:bg-[#913B4F] hover:text-[#F3EFE2]" style={{ background: "transparent", color: "#913B4F", border: "1px solid #913B4F" }}>
          {t("settings.danger.cta", locale)}
        </button>
      ) : (
        <form action={action} className="space-y-4">
          <div
            className="rounded-[10px] px-4 py-3.5 text-[13.5px] leading-relaxed"
            style={{ background: "#FCE7E7", border: "1px solid #C53E0F", borderLeft: "3px solid #BE123C", color: "#7F1D1D" }}
          >
            <p className="m-0"><strong>{t("settings.danger.warn_title", locale)}</strong></p>
            <ul className="mt-2 pl-5 list-disc">
              <li>{t("settings.danger.warn_1", locale)}</li>
              <li>{t("settings.danger.warn_2", locale)}</li>
              <li>{t("settings.danger.warn_3", locale)}</li>
            </ul>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#4A4640" }}>
              {t("settings.danger.confirm_label", locale).replace("{token}", expected)}
            </label>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value.toUpperCase())} className="w-full px-3.5 py-3 rounded-[10px] text-sm outline-none focus:border-rose-700" style={{ background: "#fdfbf4", border: "1px solid rgba(31,36,32,0.15)", color: "#1F2420" }} placeholder={expected} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#4A4640" }}>{t("settings.email.current_password", locale)}</label>
            <input name="password" type="password" required className="w-full px-3.5 py-3 rounded-[10px] text-sm outline-none focus:border-rose-700" style={{ background: "#fdfbf4", border: "1px solid rgba(31,36,32,0.15)", color: "#1F2420" }} />
          </div>
          <input type="hidden" name="confirm" value={confirmText} />
          {state?.error && <p className="text-sm" style={{ color: "#9F1239" }}>{state.error}</p>}
          <div className="flex gap-2.5">
            <button disabled={pending || confirmText !== expected} className="rounded-[11px] py-2.5 px-5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#913B4F] hover:text-[#F3EFE2]" style={{ background: "transparent", color: "#913B4F", border: "1px solid #913B4F" }}>
              {pending ? "…" : t("settings.danger.cta_final", locale)}
            </button>
            <button type="button" onClick={() => { setOpen(false); setConfirmText(""); }} className="text-sm" style={{ color: "#7A7268" }}>{t("settings.cancel", locale)}</button>
          </div>
        </form>
      )}
    </SettingsSection>
  );
}

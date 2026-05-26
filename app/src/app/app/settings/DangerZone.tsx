"use client";
import { useActionState, useState } from "react";
import { requestAccountDeletionAction } from "./actions";
import { t, type Locale } from "@/lib/i18n";
import SettingsSection from "./SettingsSection";

export default function DangerZone({ locale, email, subActive, subEndsAt }: { locale: Locale; email: string; subActive: boolean; subEndsAt: string | null }) {
  const [state, action, pending] = useActionState(requestAccountDeletionAction, { ok: false, error: null as string | null });
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const expected = "LOESCHEN";
  return (
    <SettingsSection title={t("settings.danger.title", locale)} stripeVariant="danger">
      <p className="text-sm leading-relaxed mb-4" style={{ color: "#4A4640" }}>{t("settings.danger.body", locale)}</p>
      {subActive && (
        <div className="rounded-md px-4 py-3.5 mb-4 text-[13.5px] leading-relaxed" style={{ background: "#FFF6E5", border: "1px solid #C28F1F", borderLeft: "3px solid #A77E22", color: "#7A4E13" }}>
          <p className="m-0 font-semibold">{locale === "en" ? "Active subscription" : "Aktives Abo"}</p>
          <p className="mt-1 m-0">
            {locale === "en"
              ? <>You can&apos;t delete your account while a subscription is active. <a href="/app/billing" className="underline font-semibold">Cancel your subscription first</a> — the account can then be deleted once the billing period ends.</>
              : <>Du kannst dein Konto nicht loeschen, solange ein Abo aktiv ist. <a href="/app/billing" className="underline font-semibold">Bitte erst Abo kuendigen</a> — der Account kann nach Ablauf der Abrechnungsperiode geloescht werden.</>}
          </p>
        </div>
      )}
      {!open ? (
        <button disabled={subActive} onClick={() => setOpen(true)} className="rounded-md py-2 px-4 text-sm font-medium transition-colors hover:bg-[#913B4F] hover:text-[#F3EFE2] disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: "transparent", color: "#913B4F", border: "1px solid #913B4F" }}>
          {t("settings.danger.cta", locale)}
        </button>
      ) : (
        <form action={action} className="space-y-4">
          <div
            className="rounded-md px-4 py-3.5 text-[13.5px] leading-relaxed"
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
            <input value={confirmText} onChange={e => setConfirmText(e.target.value.toUpperCase())} className="w-full px-3.5 py-3 rounded-md text-sm outline-none focus:border-rose-700" style={{ background: "#fdfbf4", border: "1px solid rgba(31,36,32,0.15)", color: "#1F2420" }} placeholder={expected} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#4A4640" }}>{t("settings.email.current_password", locale)}</label>
            <input name="password" type="password" required className="w-full px-3.5 py-3 rounded-md text-sm outline-none focus:border-rose-700" style={{ background: "#fdfbf4", border: "1px solid rgba(31,36,32,0.15)", color: "#1F2420" }} />
          </div>
          <input type="hidden" name="confirm" value={confirmText} />
          {state?.error && <p className="text-sm" style={{ color: "#9F1239" }}>{state.error}</p>}
          <div className="flex gap-2.5">
            <button disabled={pending || confirmText !== expected} className="rounded-md py-2.5 px-5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#913B4F] hover:text-[#F3EFE2]" style={{ background: "transparent", color: "#913B4F", border: "1px solid #913B4F" }}>
              {pending ? "…" : t("settings.danger.cta_final", locale)}
            </button>
            <button type="button" onClick={() => { setOpen(false); setConfirmText(""); }} className="text-sm" style={{ color: "#7A7268" }}>{t("settings.cancel", locale)}</button>
          </div>
        </form>
      )}
    </SettingsSection>
  );
}

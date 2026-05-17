"use client";
import { t, type Locale, COOKIE_NAME } from "@/lib/i18n";
import SettingsSection from "./SettingsSection";

export default function LanguageSection({ locale }: { locale: Locale }) {
  function set(lang: "de" | "en") {
    document.cookie = `${COOKIE_NAME}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  }
  return (
    <SettingsSection title={t("settings.language.title", locale)}>
      <p className="text-sm mb-4" style={{ color: "#4A4640" }}>{t("settings.language.body", locale)}</p>
      <div className="flex gap-2">
        {(["de", "en"] as const).map(l => (
          <button key={l} onClick={() => set(l)} className="px-4 py-2 rounded-[10px] text-sm font-medium transition-colors" style={l === locale ? { background: "#1F2420", color: "#F3EFE2" } : { background: "transparent", color: "#4A4640", border: "1px solid rgba(31,36,32,0.20)" }}>
            {l === "de" ? "Deutsch" : "English"}
          </button>
        ))}
      </div>
    </SettingsSection>
  );
}

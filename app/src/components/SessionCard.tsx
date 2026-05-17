"use client";
import Link from "next/link";
import type { SessionRow } from "./types";
import SessionMenu from "./SessionMenu";
import { t, type Locale } from "@/lib/i18n";

export default function SessionCard({ s, closed = false, locale = "de" }: { s: SessionRow; closed?: boolean; locale?: Locale }) {
  const dateLocale = locale === "en" ? "en-US" : "de-DE";
  return (
    <div className="relative group">
      <Link href={`/app/sessions/${s.id}`}
        className="block p-5 pr-14 rounded-2xl border border-stone-300 bg-[#F3EFE2] hover:bg-white hover:border-rose-700/40 transition-all shadow-sm">
        <div className="font-medium truncate text-stone-900 group-hover:text-rose-800">{s.title}</div>
        <div className="text-xs mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {closed ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white font-bold text-[10px] uppercase tracking-wide shadow-sm"
              style={{ background: "linear-gradient(180deg, #4C1D95, #BE123C)" }}>
              {t("dashboard.closed", locale)}
            </span>
          ) : (
            <span className="text-stone-600 font-medium">{t("dashboard.round", locale)} {s.currentRound}</span>
          )}
          <span className="text-stone-500">{s.personaCount} {t("dashboard.personas", locale)}</span>
        </div>
        <div className="text-xs text-stone-400 mt-1">
          {new Date(s.updatedAt).toLocaleDateString(dateLocale, { day:"2-digit", month:"short", year:"numeric" })}
        </div>
      </Link>
      <div className="absolute top-3 right-3">
        <SessionMenu sessionId={s.id} locale={locale} />
      </div>
    </div>
  );
}

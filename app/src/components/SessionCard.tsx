"use client";
import Link from "next/link";
import type { SessionRow } from "./types";
import SessionMenu from "./SessionMenu";

export default function SessionCard({ s, closed = false }: { s: SessionRow; closed?: boolean }) {
  return (
    <div className="relative group">
      <Link href={`/app/sessions/${s.id}`}
        className="block p-5 pr-14 rounded-2xl border border-stone-200 bg-white/50 hover:bg-white/80 hover:border-emerald-700/40 transition-all">
        <div className="font-medium truncate text-stone-900 group-hover:text-emerald-800">{s.title}</div>
        <div className="text-xs mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {closed ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wide border border-emerald-700/30">
              Abgeschlossen
            </span>
          ) : (
            <span className="text-stone-600 font-medium">Runde {s.currentRound}</span>
          )}
          <span className="text-stone-500">{s.personaCount} Personas</span>
        </div>
        <div className="text-xs text-stone-400 mt-1">
          {new Date(s.updatedAt).toLocaleDateString("de-DE", { day:"2-digit", month:"short", year:"numeric" })}
        </div>
      </Link>
      <div className="absolute top-3 right-3">
        <SessionMenu sessionId={s.id} />
      </div>
    </div>
  );
}

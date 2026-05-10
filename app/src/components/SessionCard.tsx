"use client";
import Link from "next/link";
import type { SessionRow } from "./types";
import SessionMenu from "./SessionMenu";

export default function SessionCard({ s }: { s: SessionRow }) {
  return (
    <div className="relative group">
      <Link href={`/app/sessions/${s.id}`}
        className="block p-5 pr-14 rounded-2xl border border-stone-200 bg-white/50 hover:bg-white/80 hover:border-emerald-700/40 transition-all">
        <div className="font-medium truncate text-stone-900 group-hover:text-emerald-800">{s.title}</div>
        <div className="text-xs text-stone-500 mt-1.5 flex flex-wrap gap-x-3">
          <span>{s.status}</span>
          <span>Runde {s.currentRound}</span>
          <span>{s.personaCount} Personas</span>
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

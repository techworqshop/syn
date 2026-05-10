"use client";
import { renderMarkdown } from "./Markdown";
import { useEffect, useRef, useState } from "react";
import type { PanelPersona, PanelSynthesis } from "./types";

type Props = {
  sessionId: string;
  refreshToken: number;
  onSelect: (slot: number) => void;
};

function rigidityLabel(r: number): string {
  if (r <= 3) return "offen";
  if (r <= 6) return "ausgewogen";
  return "standhaft";
}

const TILE_GRADIENT: Record<number,string> = {
  1: "from-orange-700 via-red-700 to-orange-800 border-orange-400 text-white shadow-md bubble-glass",
  2: "from-yellow-600 via-amber-600 to-orange-700 border-amber-400 text-white shadow-md bubble-glass",
  3: "from-lime-700 via-green-600 to-emerald-700 border-lime-400 text-white shadow-md bubble-glass",
  4: "from-amber-900 via-orange-950 to-red-950 border-amber-600 text-white shadow-md bubble-glass",
  5: "from-red-800 via-orange-900 to-amber-900 border-red-600 text-white shadow-md bubble-glass"
};

export default function PersonaSidebar({ sessionId, refreshToken, onSelect }: Props) {
  const [personas, setPersonas] = useState<PanelPersona[]>([]);
  const [syntheses, setSyntheses] = useState<PanelSynthesis[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [synthOpen, setSynthOpen] = useState<number | null>(null);
  const [localRigidity, setLocalRigidity] = useState<Record<number, number>>({});
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout> | null>>({});

  useEffect(() => {
    let cancel = false;
    fetch(`/api/sessions/${sessionId}/personas`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (cancel) return;
        setPersonas(d.personas || []);
        setSyntheses(d.syntheses || []);
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, [sessionId, refreshToken]);

  const bySlot: Record<number, PanelPersona> = {};
  for (const p of personas) {
    const slot = p.slack_slot ?? 0;
    if (slot >= 1 && slot <= 5) bySlot[slot] = p;
  }

  function changeRigidity(slot: number, value: number) {
    setLocalRigidity(prev => ({ ...prev, [slot]: value }));
    if (saveTimers.current[slot]) clearTimeout(saveTimers.current[slot]!);
    saveTimers.current[slot] = setTimeout(() => {
      fetch(`/api/sessions/${sessionId}/personas/${slot}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rigidity: value })
      }).catch(() => {});
    }, 400);
  }

  return (
    <aside className="w-72 border-l border-white/40 glass-card p-3 space-y-2 overflow-y-auto">
      <div className="text-xs uppercase tracking-wide text-stone-500 mb-2 px-1">Personas</div>
      {[1,2,3,4,5].filter(n => bySlot[n]).map(n => {
        const p = bySlot[n];
        const isExp = expanded === n;
        return (
          <div key={n} className={`rounded-2xl border bg-gradient-to-br ${TILE_GRADIENT[n] || "from-neutral-900/60 to-neutral-900/40 border-stone-300"} overflow-hidden transition-all hover:shadow-lg`}>
            <div className="flex items-stretch">
              <button onClick={() => onSelect(n)}
                className="flex-1 text-left p-3 hover:bg-stone-200/50 flex items-center gap-2.5">
                {p ? (
                  p.imageReady ? (
                    <img src={`/api/persona-images/${sessionId}/${n}`} alt="" className="w-9 h-9 rounded-lg object-cover bg-stone-50 shrink-0" onError={e => (e.currentTarget.style.display="none")} />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-neutral-800 via-neutral-700/60 to-neutral-800 shrink-0 flex items-center justify-center relative overflow-hidden" title="Portrait wird generiert">
                      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-neutral-600/20 to-transparent" />
                      <svg className="w-4 h-4 animate-spin text-stone-700 relative" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                        <path d="M12 2 a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    </div>
                  )
                ) : null}
                <div className="flex-1 min-w-0">
                <div className="font-medium">{p?.name || `Slot ${n}`}</div>
                <div className="text-xs text-white/85 mt-0.5 line-clamp-1">
                  {p ? (p.type && p.type.toLowerCase() !== "human" ? p.type : null) : "Noch nicht zugewiesen"}
                </div>
                </div>
              </button>
              {p && (
                <button onClick={() => setExpanded(isExp ? null : n)}
                  className="px-3 border-l border-white/30 text-white/80 hover:text-white hover:bg-white/15"
                  title={isExp ? "Zuklappen" : "Details"}>
                  {isExp ? "▾" : "▸"}
                </button>
              )}
            </div>
            {p && (() => {
              const current = localRigidity[n] ?? (typeof p.rigidity === "number" ? p.rigidity : 5);
              return (
                <div className="border-t border-white/30 px-3 py-2 backdrop-blur-md bg-black/15">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-white font-bold mb-1">
                    <span>Haltung</span>
                    <span className="text-white normal-case tracking-normal font-bold">{rigidityLabel(current)}</span>
                  </div>
                  <input type="range" min={0} max={10} step={1} value={current}
                    onChange={e => changeRigidity(n, parseInt(e.target.value))}
                    className="w-full accent-lime-300 cursor-pointer"
                    title={`Rigidity ${current}/10`} />
                  <div className="flex justify-between text-[10px] text-white/90 font-semibold mt-0.5">
                    <span>offen</span>
                    <span>standhaft</span>
                  </div>
                </div>
              );
            })()}
            {isExp && p && (
              <div className="border-t border-white/40 p-3 space-y-2 text-xs backdrop-blur-md bg-white/40">
                {p.core_perspective && (
                  <div><div className="text-stone-500">Perspektive</div>
                    <div className="text-stone-800 whitespace-pre-wrap">{p.core_perspective}</div></div>
                )}
                {p.profile && (
                  <div><div className="text-stone-500">Profil</div>
                    <div className="text-stone-700 whitespace-pre-wrap">{p.profile}</div></div>
                )}
                {p.position_summary && (
                  <div><div className="text-stone-500">Aktuelle Position</div>
                    <div className="text-stone-800 whitespace-pre-wrap">{p.position_summary}</div></div>
                )}
                {[1,2,3].map(r => {
                  const key = `round_${r}_response` as keyof PanelPersona;
                  const resp = p[key] as string | undefined;
                  return resp ? (
                    <details key={r}>
                      <summary className="text-amber-400 cursor-pointer hover:text-amber-300">
                        Runde {r}
                      </summary>
                      <div className="mt-1 text-stone-700 whitespace-pre-wrap pl-2 border-l-2 border-amber-800">
                        {resp}
                      </div>
                    </details>
                  ) : null;
                })}
              </div>
            )}
          </div>
        );
      })}
      {syntheses.length > 0 && (
        <div className="mt-4 pt-4 border-t border-stone-300">
          <div className="text-xs uppercase tracking-wide text-stone-500 mb-2 px-1">Synthesen</div>
          {syntheses.sort((a,b) => a.round_number - b.round_number).map(s => (
            <div key={s.round_number} className="rounded-xl border border-emerald-400 bg-gradient-to-br from-emerald-700 via-green-700 to-lime-700 mb-2 overflow-hidden shadow-md bubble-glass">
              <button onClick={() => setSynthOpen(synthOpen === s.round_number ? null : s.round_number)}
                className="w-full text-left p-3 hover:bg-white/10">
                <div className="font-semibold text-white">Runde {s.round_number}</div>
              </button>
              {synthOpen === s.round_number && (
                <div className="border-t border-white/40 p-3 text-xs text-stone-800 backdrop-blur-md bg-white/40">
                  {renderMarkdown(s.synthesis_text)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

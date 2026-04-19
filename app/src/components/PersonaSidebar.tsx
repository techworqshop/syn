"use client";
import { useEffect, useRef, useState } from "react";
import type { PanelPersona, PanelSynthesis } from "./types";

type Props = {
  sessionId: string;
  refreshToken: number;
  onSelect: (slot: number) => void;
};

function rigidityLabel(r: number): string {
  if (r <= 3) return "standhaft";
  if (r <= 6) return "ausgewogen";
  return "offen";
}

const TILE_GRADIENT: Record<number,string> = {
  1: "from-rose-500/15 via-pink-500/10 to-fuchsia-500/15 border-rose-400/30",
  2: "from-amber-500/15 via-orange-500/10 to-red-500/15 border-amber-400/30",
  3: "from-emerald-500/15 via-teal-500/10 to-cyan-500/15 border-emerald-400/30",
  4: "from-violet-500/15 via-purple-500/10 to-fuchsia-500/15 border-violet-400/30",
  5: "from-sky-500/15 via-blue-500/10 to-indigo-500/15 border-sky-400/30"
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
    if (slot >= 1 && slot <= 5 && p.imageReady) bySlot[slot] = p;
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
    <aside className="w-72 border-l border-neutral-800 bg-neutral-900/30 p-3 space-y-2 overflow-y-auto">
      <div className="text-xs uppercase tracking-wide text-neutral-500 mb-2 px-1">Personas</div>
      {[1,2,3,4,5].map(n => {
        const p = bySlot[n];
        const isExp = expanded === n;
        return (
          <div key={n} className={`rounded-2xl border bg-gradient-to-br ${TILE_GRADIENT[n] || "from-neutral-900/60 to-neutral-900/40 border-neutral-800"} overflow-hidden transition-all hover:shadow-lg`}>
            <div className="flex items-stretch">
              <button onClick={() => onSelect(n)}
                className="flex-1 text-left p-3 hover:bg-neutral-800/50 flex items-center gap-2.5">
                {p ? <img src={`/api/persona-images/${sessionId}/${n}`} alt="" className="w-9 h-9 rounded-lg object-cover bg-neutral-900 shrink-0" onError={e => (e.currentTarget.style.display="none")} /> : null}
                <div className="flex-1 min-w-0">
                <div className="font-medium">{p?.name || `Slot ${n}`}</div>
                <div className="text-xs text-neutral-500 mt-0.5 line-clamp-1">
                  {p?.type || "Noch nicht zugewiesen"}
                </div>
                </div>
              </button>
              {p && (
                <button onClick={() => setExpanded(isExp ? null : n)}
                  className="px-3 border-l border-neutral-800 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/50"
                  title={isExp ? "Zuklappen" : "Details"}>
                  {isExp ? "▾" : "▸"}
                </button>
              )}
            </div>
            {p && (() => {
              const current = localRigidity[n] ?? (typeof p.rigidity === "number" ? p.rigidity : 5);
              return (
                <div className="border-t border-neutral-800/60 px-3 py-2 bg-neutral-950/30">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-neutral-500 mb-1">
                    <span>Haltung</span>
                    <span className="text-neutral-300 normal-case tracking-normal">{rigidityLabel(current)}</span>
                  </div>
                  <input type="range" min={0} max={10} step={1} value={current}
                    onChange={e => changeRigidity(n, parseInt(e.target.value))}
                    className="w-full accent-fuchsia-500 cursor-pointer"
                    title={`Rigidity ${current}/10`} />
                  <div className="flex justify-between text-[9px] text-neutral-600 mt-0.5">
                    <span>standhaft</span>
                    <span>offen</span>
                  </div>
                </div>
              );
            })()}
            {isExp && p && (
              <div className="border-t border-neutral-800 p-3 space-y-2 text-xs bg-neutral-950/50">
                {p.core_perspective && (
                  <div><div className="text-neutral-500">Perspektive</div>
                    <div className="text-neutral-200 whitespace-pre-wrap">{p.core_perspective}</div></div>
                )}
                {p.profile && (
                  <div><div className="text-neutral-500">Profil</div>
                    <div className="text-neutral-300 whitespace-pre-wrap">{p.profile}</div></div>
                )}
                {p.position_summary && (
                  <div><div className="text-neutral-500">Aktuelle Position</div>
                    <div className="text-neutral-200 whitespace-pre-wrap">{p.position_summary}</div></div>
                )}
                {[1,2,3].map(r => {
                  const key = `round_${r}_response` as keyof PanelPersona;
                  const resp = p[key] as string | undefined;
                  return resp ? (
                    <details key={r}>
                      <summary className="text-sky-400 cursor-pointer hover:text-sky-300">
                        Runde {r}
                      </summary>
                      <div className="mt-1 text-neutral-300 whitespace-pre-wrap pl-2 border-l-2 border-sky-800">
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
        <div className="mt-4 pt-4 border-t border-neutral-800">
          <div className="text-xs uppercase tracking-wide text-neutral-500 mb-2 px-1">Synthesen</div>
          {syntheses.sort((a,b) => a.round_number - b.round_number).map(s => (
            <div key={s.round_number} className="rounded border border-emerald-900/50 bg-emerald-950/20 mb-2 overflow-hidden">
              <button onClick={() => setSynthOpen(synthOpen === s.round_number ? null : s.round_number)}
                className="w-full text-left p-3 hover:bg-emerald-950/40">
                <div className="font-medium text-emerald-300">Runde {s.round_number}</div>
              </button>
              {synthOpen === s.round_number && (
                <div className="border-t border-emerald-900/50 p-3 text-xs text-neutral-200 whitespace-pre-wrap bg-neutral-950/50">
                  {s.synthesis_text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

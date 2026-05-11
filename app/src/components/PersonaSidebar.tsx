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

const RAIL_GRADIENT: Record<number,string> = {
  1: "from-orange-600 to-red-800",
  2: "from-yellow-500 to-orange-700",
  3: "from-lime-600 to-emerald-800",
  4: "from-amber-800 to-red-950",
  5: "from-red-700 to-amber-900"
};

export default function PersonaSidebar({ sessionId, refreshToken, onSelect }: Props) {
  const [personas, setPersonas] = useState<PanelPersona[]>([]);
  const [syntheses, setSyntheses] = useState<PanelSynthesis[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [synthOpen, setSynthOpen] = useState<number | null>(null);
  const [localRigidity, setLocalRigidity] = useState<Record<number, number>>({});
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout> | null>>({});
  const [collapsed, setCollapsed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem("syn.sidebar.collapsed");
      if (v === "1") setCollapsed(true);
    } catch {}
  }, []);

  function toggleCollapsed() {
    setCollapsed(c => {
      const next = !c;
      try { localStorage.setItem("syn.sidebar.collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  }

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

  if (collapsed) {
    return (
      <aside className="w-14 glass-card-dark flex flex-col items-center py-2 gap-1.5 overflow-y-auto">
        <button onClick={toggleCollapsed}
          title="Sidebar ausklappen"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-700 hover:text-stone-900 hover:bg-amber-100 transition-colors mb-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        {[1,2,3,4,5].filter(n => bySlot[n]).map(n => {
          const p = bySlot[n];
          const initials = (p.name ?? "P").split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();
          return (
            <button key={n} onClick={() => onSelect(n)}
              title={`${p.name || `Slot ${n}`} (1:1 Chat)`}
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${RAIL_GRADIENT[n]} flex items-center justify-center text-white text-xs font-bold ring-1 ring-white/30 shadow-md hover:scale-105 transition-transform overflow-hidden`}>
              {p.imageReady
                ? <img src={`/api/persona-images/${sessionId}/${n}`} alt="" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display="none")} />
                : <span>{initials}</span>}
            </button>
          );
        })}
        {syntheses.length > 0 && (
          <>
            <div className="w-7 h-px bg-stone-400/60 my-1" />
            {syntheses.sort((a,b)=>a.round_number-b.round_number).map(s => (
              <button key={s.round_number}
                onClick={() => { toggleCollapsed(); setSynthOpen(s.round_number); }}
                title={`Synthese Runde ${s.round_number}`}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-700 to-lime-700 text-white text-[10px] font-bold flex items-center justify-center ring-1 ring-white/30 shadow-md hover:scale-105 transition-transform">
                R{s.round_number}
              </button>
            ))}
          </>
        )}
      </aside>
    );
  }

  return (
    <aside className="w-72 glass-card-dark p-3 space-y-2 overflow-y-auto">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-xs uppercase tracking-wide text-stone-700 font-bold">Personas</div>
        <button onClick={toggleCollapsed}
          title="Sidebar einklappen"
          className="w-6 h-6 rounded-md flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-amber-100 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
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
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200 shrink-0 flex items-center justify-center relative overflow-hidden ring-1 ring-white/40" title="Portrait wird generiert">
                      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                      <svg className="w-4 h-4 animate-spin text-stone-800 relative" viewBox="0 0 24 24" fill="none">
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
              <div className="border-t border-white/40 p-3 space-y-2 text-xs backdrop-blur-md bg-white/55">
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
          <div className="text-xs uppercase tracking-wide text-stone-700 font-bold mb-2 px-1">Synthesen</div>
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

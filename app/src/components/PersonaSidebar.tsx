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

// Vertikale Akzent-Verläufe pro Slot (gleich wie MessageBubble)
type Stops = { top: string; bottom: string };
const ACCENT: Record<number, Stops> = {
  1: { top: "#E55260", bottom: "#B82338" },
  2: { top: "#3A7E58", bottom: "#144A2C" },
  3: { top: "#F26A38", bottom: "#C53E0F" },
  4: { top: "#DBA947", bottom: "#A77E22" },
  5: { top: "#913B4F", bottom: "#4F1A28" }
};
const SYNTH_ACCENT: Stops = { top: "#B45309", bottom: "#78350F" };

function gradStyle(s: Stops) {
  return { background: `linear-gradient(180deg, ${s.top}, ${s.bottom})` } as React.CSSProperties;
}

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
      <aside className="w-14 glass-card-dark flex flex-col items-center py-2 gap-1.5 overflow-y-auto border-r border-stone-300/60">
        <button onClick={toggleCollapsed}
          title="Sidebar ausklappen"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-700 hover:text-stone-900 hover:bg-amber-100 transition-colors mb-1">
          {/* Collapsed: arrow points right (click to expand to the right) */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
        {[1,2,3,4,5].filter(n => bySlot[n]).map(n => {
          const p = bySlot[n];
          const stops = ACCENT[n];
          const initials = (p.name ?? "P").split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();
          return (
            <button key={n} onClick={() => onSelect(n)}
              title={`${p.name || `Slot ${n}`} (1:1 Chat)`}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold ring-1 ring-white/40 shadow-md hover:scale-105 transition-transform overflow-hidden"
              style={gradStyle(stops)}>
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
                className="w-10 h-10 rounded-full text-white text-[10px] font-bold flex items-center justify-center ring-1 ring-white/40 shadow-md hover:scale-105 transition-transform"
                style={gradStyle(SYNTH_ACCENT)}>
                R{s.round_number}
              </button>
            ))}
          </>
        )}
      </aside>
    );
  }

  return (
    <aside className="w-72 glass-card-dark p-3 space-y-2 overflow-y-auto border-r border-stone-300/60">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-xs uppercase tracking-wide text-stone-700 font-bold">Personas</div>
        <button onClick={toggleCollapsed}
          title="Sidebar einklappen"
          className="w-6 h-6 rounded-md flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-amber-100 transition-colors">
          {/* Expanded: arrow points left (click to collapse to left) */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>
      {[1,2,3,4,5].filter(n => bySlot[n]).map(n => {
        const p = bySlot[n];
        const isExp = expanded === n;
        const stops = ACCENT[n];
        const initials = (p.name ?? "P").split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();
        return (
          <div key={n}
            className="relative rounded-2xl bg-[#F3EFE2] border border-stone-300/60 shadow-sm overflow-hidden transition-all hover:shadow-md">
            {/* 4px Edge-Stripe links mit vertikalem Color-Color-Verlauf */}
            <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1"
              style={gradStyle(stops)} />
            <div className="flex items-stretch pl-2">
              <button onClick={() => onSelect(n)}
                className="flex-1 text-left p-3 hover:bg-white/50 flex items-center gap-2.5 transition-colors">
                <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white text-xs font-bold shrink-0 ring-1 ring-white/40"
                  style={gradStyle(stops)}>
                  {p.imageReady
                    ? <img src={`/api/persona-images/${sessionId}/${n}`} alt="" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display="none")} />
                    : <span>{initials}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13px] truncate" style={{ color: stops.bottom }}>{p?.name || `Slot ${n}`}</div>
                  <div className="text-xs text-stone-600 mt-0.5 line-clamp-1">
                    {p ? (p.type && p.type.toLowerCase() !== "human" ? p.type : "Persona") : "Noch nicht zugewiesen"}
                  </div>
                </div>
              </button>
              <button onClick={() => setExpanded(isExp ? null : n)}
                className="px-2 text-stone-500 hover:text-stone-900 hover:bg-white/50 transition-colors"
                title={isExp ? "Zuklappen" : "Details"}>
                {isExp ? "▾" : "▸"}
              </button>
            </div>
            {(() => {
              const current = localRigidity[n] ?? (typeof p.rigidity === "number" ? p.rigidity : 5);
              return (
                <div className="border-t border-stone-200 px-3 py-2 bg-white/40 pl-4"
                  style={{ ['--edge-top' as string]: stops.top, ['--edge-bottom' as string]: stops.bottom } as React.CSSProperties}>
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wide font-bold mb-1">
                    <span className="text-stone-700">Haltung</span>
                    <span className="normal-case tracking-normal font-bold" style={{ color: stops.bottom }}>{rigidityLabel(current)}</span>
                  </div>
                  <input type="range" min={0} max={10} step={1} value={current}
                    onChange={e => changeRigidity(n, parseInt(e.target.value))}
                    className="rigidity-slider"
                    title={`Rigidity ${current}/10`} />
                  <div className="flex justify-between text-[10px] text-stone-600 font-semibold mt-0.5">
                    <span>offen</span>
                    <span>standhaft</span>
                  </div>
                </div>
              );
            })()}
            {isExp && (
              <div className="border-t border-stone-200 p-3 space-y-2 text-xs bg-stone-50 pl-4">
                {p.core_perspective && (
                  <div><div className="text-stone-500 font-medium">Perspektive</div>
                    <div className="text-stone-800 whitespace-pre-wrap">{p.core_perspective}</div></div>
                )}
                {p.profile && (
                  <div><div className="text-stone-500 font-medium">Profil</div>
                    <div className="text-stone-700 whitespace-pre-wrap">{p.profile}</div></div>
                )}
                {p.position_summary && (
                  <div><div className="text-stone-500 font-medium">Aktuelle Position</div>
                    <div className="text-stone-800 whitespace-pre-wrap">{p.position_summary}</div></div>
                )}
                {[1,2,3].map(r => {
                  const key = `round_${r}_response` as keyof PanelPersona;
                  const resp = p[key] as string | undefined;
                  return resp ? (
                    <details key={r}>
                      <summary className="cursor-pointer font-medium" style={{ color: stops.bottom }}>
                        Runde {r}
                      </summary>
                      <div className="mt-1 text-stone-700 whitespace-pre-wrap pl-2 border-l-2"
                        style={{ borderColor: stops.bottom }}>
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
            <div key={s.round_number} className="relative rounded-2xl bg-[#F3EFE2] border border-stone-300/60 mb-2 overflow-hidden shadow-sm hover:shadow-md transition-all">
              <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1"
                style={gradStyle(SYNTH_ACCENT)} />
              <button onClick={() => setSynthOpen(synthOpen === s.round_number ? null : s.round_number)}
                className="w-full text-left p-3 pl-4 hover:bg-white/50 transition-colors">
                <div className="font-semibold" style={{ color: SYNTH_ACCENT.bottom }}>Runde {s.round_number}</div>
              </button>
              {synthOpen === s.round_number && (
                <div className="border-t border-stone-200 p-3 pl-4 text-xs text-stone-800 bg-stone-50">
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

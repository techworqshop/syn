"use client";
import { useEffect, useState } from "react";
import type { PanelPersona, PanelSynthesis } from "./types";
import { PERSONA_NAMES } from "./types";

type Props = {
  sessionId: string;
  refreshToken: number;
  onSelect: (slot: number) => void;
};

const COLORS = ["", "sky", "rose", "amber", "emerald", "violet"];

export default function PersonaSidebar({ sessionId, refreshToken, onSelect }: Props) {
  const [personas, setPersonas] = useState<PanelPersona[]>([]);
  const [syntheses, setSyntheses] = useState<PanelSynthesis[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [synthOpen, setSynthOpen] = useState<number | null>(null);

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

  return (
    <aside className="w-72 border-l border-neutral-800 bg-neutral-900/30 p-3 space-y-2 overflow-y-auto">
      <div className="text-xs uppercase tracking-wide text-neutral-500 mb-2 px-1">Personas</div>
      {[1,2,3,4,5].map(n => {
        const p = bySlot[n];
        const isExp = expanded === n;
        return (
          <div key={n} className="rounded border border-neutral-800 bg-neutral-900/50 overflow-hidden">
            <div className="flex items-stretch">
              <button onClick={() => onSelect(n)}
                className="flex-1 text-left p-3 hover:bg-neutral-800/50">
                <div className="font-medium">{p?.name || `Slot ${n}`}</div>
                <div className="text-xs text-neutral-500 mt-0.5 line-clamp-1">
                  {p?.type || "Noch nicht zugewiesen"}
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

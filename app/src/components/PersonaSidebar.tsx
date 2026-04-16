"use client";
import { PERSONA_NAMES } from "./types";

export default function PersonaSidebar({ onSelect }: { onSelect: (slot: number) => void }) {
  const slots = [1, 2, 3, 4, 5];
  const colors = ["sky", "rose", "amber", "emerald", "violet"];
  return (
    <aside className="w-64 border-l border-neutral-800 bg-neutral-900/30 p-4 space-y-2 overflow-y-auto">
      <div className="text-xs uppercase tracking-wide text-neutral-500 mb-3">Personas</div>
      {slots.map((n, i) => (
        <button key={n} onClick={() => onSelect(n)}
          className={`w-full text-left p-3 rounded border border-neutral-800 hover:border-${colors[i]}-500 bg-neutral-900/50 transition-colors`}>
          <div className="font-medium">{PERSONA_NAMES[n]}</div>
          <div className="text-xs text-neutral-500 mt-0.5">Slot {n}</div>
        </button>
      ))}
    </aside>
  );
}

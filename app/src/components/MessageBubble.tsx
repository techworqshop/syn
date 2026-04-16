import type { Message } from "./types";
import { PERSONA_NAMES } from "./types";

const COLORS: Record<string, string> = {
  user: "bg-sky-600 text-white self-end",
  coordinator: "bg-neutral-800 text-neutral-100 border border-neutral-700",
  persona: "bg-indigo-950 text-neutral-100 border border-indigo-800",
  synthesis: "bg-emerald-950 text-neutral-100 border border-emerald-800",
  system: "bg-amber-950 text-neutral-200 border border-amber-800"
};

const LABELS: Record<string, string> = {
  user: "Du",
  coordinator: "Syn",
  persona: "Persona",
  synthesis: "Synthese",
  system: "System"
};

export default function MessageBubble({ m }: { m: Message }) {
  const color = COLORS[m.role] ?? COLORS.system;
  const isUser = m.role === "user";
  let label = LABELS[m.role] ?? m.role;
  if (m.role === "persona" && m.personaSlot) label = PERSONA_NAMES[m.personaSlot] || `Persona ${m.personaSlot}`;
  else if (m.role === "persona" && m.personaName) label = m.personaName;
  if (m.role === "synthesis" && m.roundNumber) label = `Synthese Runde ${m.roundNumber}`;
  return (
    <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      <div className="text-xs text-neutral-500 px-1">{label}</div>
      <div className={`max-w-[80%] rounded-lg px-4 py-3 whitespace-pre-wrap ${color}`}>
        {m.content}
      </div>
    </div>
  );
}

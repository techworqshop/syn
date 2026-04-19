import type { Message } from "./types";

const LABELS: Record<string, string> = {
  user: "Du",
  coordinator: "Syn",
  persona: "Persona",
  synthesis: "Synthese",
  system: "System"
};

const BUBBLE: Record<string, string> = {
  user: "bg-gradient-to-br from-sky-600 to-sky-700 text-white shadow-lg shadow-sky-900/30",
  coordinator: "bg-neutral-900 text-neutral-100 border border-neutral-800",
  persona: "bg-gradient-to-br from-indigo-950 to-indigo-900/70 text-neutral-100 border border-indigo-800/60",
  synthesis: "bg-gradient-to-br from-emerald-950 to-emerald-900/60 text-neutral-100 border border-emerald-800/60",
  system: "bg-amber-950/40 text-amber-100 border border-amber-800/50 text-sm"
};

const PERSONA_TINT = ["bg-sky-600","bg-rose-600","bg-amber-600","bg-emerald-600","bg-violet-600"];

function Avatar({ role, name, slot }: { role: string; name?: string | null; slot?: number | null }) {
  if (role === "coordinator") {
    return <img src="/syn-avatar.svg" alt="Syn" className="w-9 h-9 rounded-full ring-2 ring-neutral-800 shrink-0" />;
  }
  if (role === "persona") {
    const initials = (name ?? "P").split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();
    const tint = slot && slot >= 1 && slot <= 5 ? PERSONA_TINT[slot - 1] : "bg-indigo-600";
    return (
      <div className={`w-9 h-9 rounded-full ${tint} flex items-center justify-center text-white text-xs font-semibold ring-2 ring-neutral-800 shrink-0`}>
        {initials}
      </div>
    );
  }
  if (role === "synthesis") {
    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-neutral-800 shrink-0">
        Σ
      </div>
    );
  }
  return null;
}

export default function MessageBubble({ m }: { m: Message }) {
  const isUser = m.role === "user";
  const color = BUBBLE[m.role] ?? BUBBLE.system;
  let label: string = LABELS[m.role] ?? m.role;
  if (m.role === "persona") label = m.personaName || (m.personaSlot ? `Persona ${m.personaSlot}` : "Persona");
  if (m.role === "synthesis" && m.roundNumber) label = `Synthese Runde ${m.roundNumber}`;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""} items-start`}>
      {!isUser && <Avatar role={m.role} name={m.personaName} slot={m.personaSlot} />}
      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[85%]`}>
        <div className={`text-xs ${isUser ? "text-sky-300/70" : "text-neutral-500"} mb-1 px-1`}>{label}</div>
        <div className={`rounded-2xl px-4 py-3 whitespace-pre-wrap text-[14px] leading-relaxed ${color}`}>
          {m.content}
        </div>
      </div>
    </div>
  );
}

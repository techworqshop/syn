import type { Message } from "./types";

const LABELS: Record<string, string> = {
  user: "Du",
  coordinator: "Syn",
  persona: "Persona",
  synthesis: "Synthese",
  system: "System"
};

const BUBBLE: Record<string, string> = {
  user: "bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-500 text-white shadow-[0_8px_24px_-6px_rgba(99,102,241,0.5)]",
  coordinator: "bg-gradient-to-br from-violet-950/80 via-fuchsia-950/50 to-neutral-900/80 text-neutral-100 border border-violet-800/40 shadow-[0_4px_16px_-4px_rgba(139,92,246,0.25)]",
  synthesis: "bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-rose-500/15 text-neutral-100 border border-amber-500/30 shadow-[0_4px_16px_-4px_rgba(245,158,11,0.3)]",
  system: "bg-amber-950/40 text-amber-100 border border-amber-800/40 text-sm"
};

const PERSONA_BUBBLE: Record<number, string> = {
  1: "bg-gradient-to-br from-rose-500/20 via-pink-500/15 to-fuchsia-500/20 border border-rose-400/30 shadow-[0_4px_16px_-4px_rgba(244,63,94,0.25)]",
  2: "bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-red-500/20 border border-amber-400/30 shadow-[0_4px_16px_-4px_rgba(251,146,60,0.25)]",
  3: "bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-cyan-500/20 border border-emerald-400/30 shadow-[0_4px_16px_-4px_rgba(16,185,129,0.25)]",
  4: "bg-gradient-to-br from-violet-500/20 via-purple-500/15 to-fuchsia-500/20 border border-violet-400/30 shadow-[0_4px_16px_-4px_rgba(139,92,246,0.25)]",
  5: "bg-gradient-to-br from-sky-500/20 via-blue-500/15 to-indigo-500/20 border border-sky-400/30 shadow-[0_4px_16px_-4px_rgba(14,165,233,0.25)]"
};

const PERSONA_AVATAR: Record<number, string> = {
  1: "bg-gradient-to-br from-rose-400 to-pink-600",
  2: "bg-gradient-to-br from-amber-400 to-orange-600",
  3: "bg-gradient-to-br from-emerald-400 to-teal-600",
  4: "bg-gradient-to-br from-violet-400 to-purple-600",
  5: "bg-gradient-to-br from-sky-400 to-cyan-600"
};

function Avatar({ role, name, slot }: { role: string; name?: string | null; slot?: number | null }) {
  if (role === "coordinator") {
    return <img src="/syn-avatar.svg" alt="Syn" className="w-9 h-9 rounded-full ring-2 ring-fuchsia-500/30 shrink-0" />;
  }
  if (role === "persona") {
    const initials = (name ?? "P").split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();
    const bg = slot && PERSONA_AVATAR[slot] ? PERSONA_AVATAR[slot] : "bg-gradient-to-br from-indigo-400 to-violet-600";
    return (
      <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center text-white text-xs font-bold ring-2 ring-white/10 shrink-0`}>
        {initials}
      </div>
    );
  }
  if (role === "synthesis") {
    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center text-white text-sm font-bold ring-2 ring-amber-400/30 shrink-0">
        &Sigma;
      </div>
    );
  }
  return null;
}

export default function MessageBubble({ m }: { m: Message }) {
  const isUser = m.role === "user";
  let color = BUBBLE[m.role] ?? BUBBLE.system;
  if (m.role === "persona" && m.personaSlot && PERSONA_BUBBLE[m.personaSlot]) {
    color = PERSONA_BUBBLE[m.personaSlot] + " text-neutral-100";
  }
  let label: string = LABELS[m.role] ?? m.role;
  if (m.role === "persona") label = m.personaName || (m.personaSlot ? `Persona ${m.personaSlot}` : "Persona");
  if (m.role === "synthesis" && m.roundNumber) label = `Synthese Runde ${m.roundNumber}`;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""} items-start`}>
      {!isUser && <Avatar role={m.role} name={m.personaName} slot={m.personaSlot} />}
      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[85%]`}>
        <div className={`text-xs ${isUser ? "text-indigo-300/80" : "text-neutral-500"} mb-1 px-1 font-medium`}>{label}</div>
        <div className={`rounded-2xl px-4 py-3 whitespace-pre-wrap text-[14px] leading-relaxed ${color}`}>
          {m.content}
        </div>
      </div>
    </div>
  );
}

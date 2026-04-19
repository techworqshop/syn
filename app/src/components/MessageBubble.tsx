import type { Message } from "./types";
import PersonaAvatar from "./PersonaAvatar";

const LABELS: Record<string, string> = {
  user: "Du",
  coordinator: "Syn",
  persona: "Persona",
  synthesis: "Synthese",
  system: "System"
};

const BUBBLE: Record<string, string> = {
  user: "bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-500 text-white shadow-[0_6px_20px_-6px_rgba(99,102,241,0.5)]",
  coordinator: "bg-gradient-to-br from-violet-950/80 via-fuchsia-950/50 to-neutral-900/80 text-neutral-100 border border-violet-800/40",
  synthesis: "bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-rose-500/15 text-neutral-100 border border-amber-500/30",
  system: "bg-amber-950/40 text-amber-100 border border-amber-800/40 text-sm"
};

const PERSONA_BUBBLE: Record<number, string> = {
  1: "bg-gradient-to-br from-rose-500/20 via-pink-500/15 to-fuchsia-500/20 border border-rose-400/30",
  2: "bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-red-500/20 border border-amber-400/30",
  3: "bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-cyan-500/20 border border-emerald-400/30",
  4: "bg-gradient-to-br from-violet-500/20 via-purple-500/15 to-fuchsia-500/20 border border-violet-400/30",
  5: "bg-gradient-to-br from-sky-500/20 via-blue-500/15 to-indigo-500/20 border border-sky-400/30"
};

const PERSONA_AVATAR: Record<number, string> = {
  1: "bg-gradient-to-br from-rose-400 to-pink-600",
  2: "bg-gradient-to-br from-amber-400 to-orange-600",
  3: "bg-gradient-to-br from-emerald-400 to-teal-600",
  4: "bg-gradient-to-br from-violet-400 to-purple-600",
  5: "bg-gradient-to-br from-sky-400 to-cyan-600"
};

function Avatar({ role, name, slot, sessionId }: { role: string; name?: string | null; slot?: number | null; sessionId?: string | null }) {
  if (role === "coordinator") {
    return (
      <img src="/api/assets/syn-avatar" alt="Syn"
        className="w-11 h-11 rounded-xl ring-1 ring-white/10 object-cover shrink-0" />
    );
  }
  if (role === "persona") {
    const initials = (name ?? "P").split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();
    const bg = slot && PERSONA_AVATAR[slot] ? PERSONA_AVATAR[slot] : "bg-gradient-to-br from-indigo-400 to-violet-600";
    if (slot && sessionId) {
      return <PersonaAvatar sessionId={sessionId} slot={slot} initials={initials} tintClass={bg} />;
    }
    return (
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center text-white text-base font-bold ring-1 ring-white/10 shrink-0`}>
        {initials}
      </div>
    );
  }
  if (role === "synthesis") {
    return (
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center text-white font-bold ring-1 ring-amber-400/30 shrink-0">
        &Sigma;
      </div>
    );
  }
  if (role === "user") {
    return (
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-base font-semibold ring-1 ring-white/10 shrink-0">
        Du
      </div>
    );
  }
  return null;
}

function fmtTime(d: string | Date) {
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

const NAME_COLOR: Record<number, string> = {
  1: "text-rose-300",
  2: "text-amber-300",
  3: "text-emerald-300",
  4: "text-violet-300",
  5: "text-sky-300"
};

export default function MessageBubble({ m }: { m: Message }) {
  const isError = typeof m.metadata === "object" && m.metadata !== null &&
    (m.metadata as { kind?: string }).kind === "error";
  let color = BUBBLE[m.role] ?? BUBBLE.system;
  if (m.role === "persona" && m.personaSlot && PERSONA_BUBBLE[m.personaSlot]) {
    color = PERSONA_BUBBLE[m.personaSlot] + " text-neutral-100";
  }
  if (isError) {
    color = "bg-gradient-to-br from-red-950/60 via-rose-950/50 to-neutral-900/60 text-rose-100 border border-red-700/50";
  }
  let label: string = LABELS[m.role] ?? m.role;
  if (m.role === "persona") label = m.personaName || (m.personaSlot ? `Persona ${m.personaSlot}` : "Persona");
  if (m.role === "synthesis" && m.roundNumber) label = `Synthese Runde ${m.roundNumber}`;
  if (isError) label = "Fehler";
  let labelColor = "text-neutral-200";
  if (m.role === "coordinator") labelColor = "text-fuchsia-300";
  if (m.role === "synthesis") labelColor = "text-amber-300";
  if (m.role === "user") labelColor = "text-sky-300";
  if (m.role === "persona" && m.personaSlot && NAME_COLOR[m.personaSlot]) labelColor = NAME_COLOR[m.personaSlot];
  if (isError) labelColor = "text-red-300";

  return (
    <div className="flex gap-3 items-start group hover:bg-white/[0.015] rounded-xl -mx-2 px-2 py-1 transition-colors">
      <Avatar role={m.role} name={m.personaName} slot={m.personaSlot} sessionId={m.sessionId} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`font-semibold text-[15px] leading-tight ${labelColor}`}>{label}</span>
          <span className="text-xs text-neutral-600">{fmtTime(m.createdAt)}</span>
        </div>
        <div className={`rounded-2xl px-4 py-3 whitespace-pre-wrap text-[14px] leading-relaxed inline-block max-w-full ${color}`}>
          {m.content}
        </div>
      </div>
    </div>
  );
}

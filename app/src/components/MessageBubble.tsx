"use client";
import type React from "react";
import { useState } from "react";
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
  user: "bg-gradient-to-br from-rose-500 via-orange-500 to-amber-600 text-white shadow-[0_6px_20px_-6px_rgba(244,114,82,0.5)] bubble-glass",
  coordinator: "bg-gradient-to-br from-violet-900 via-fuchsia-800 to-rose-900 text-white border border-violet-700/40 shadow-lg bubble-glass",
  synthesis: "bg-gradient-to-br from-amber-600 via-orange-600 to-rose-600 text-white border border-amber-500 shadow-md bubble-glass",
  system: "bg-amber-200 text-amber-950 border border-amber-400 text-sm font-medium"
};

const PERSONA_BUBBLE: Record<number, string> = {
  1: "bg-gradient-to-br from-rose-600 via-pink-600 to-fuchsia-700 text-white border border-rose-400 shadow-md bubble-glass",
  2: "bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 text-white border border-amber-500 shadow-md bubble-glass",
  3: "bg-gradient-to-br from-green-700 via-emerald-700 to-lime-700 text-white border border-green-500 shadow-md bubble-glass",
  4: "bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 text-white border border-violet-400 shadow-md bubble-glass",
  5: "bg-gradient-to-br from-red-800 via-rose-900 to-pink-800 text-white border border-rose-500 shadow-md bubble-glass"
};

const PERSONA_AVATAR: Record<number, string> = {
  1: "bg-gradient-to-br from-rose-400 to-pink-600",
  2: "bg-gradient-to-br from-amber-400 to-orange-600",
  3: "bg-gradient-to-br from-green-500 to-lime-700",
  4: "bg-gradient-to-br from-violet-400 to-purple-600",
  5: "bg-gradient-to-br from-red-600 to-rose-800"
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
    const bg = slot && PERSONA_AVATAR[slot] ? PERSONA_AVATAR[slot] : "bg-gradient-to-br from-rose-400 to-amber-500";
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
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-400 to-orange-500 flex items-center justify-center text-white text-base font-semibold ring-1 ring-white/10 shrink-0">
        Du
      </div>
    );
  }
  return null;
}

function renderInline(line: string, keyPrefix: string) {
  // Handle **bold** segments
  const parts: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) parts.push(line.slice(last, m.index));
    parts.push(<strong key={`${keyPrefix}-b${i++}`} className="font-semibold text-neutral-50">{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts.length ? parts : line;
}

function renderMarkdown(text: string) {
  const lines = text.split(/\r?\n/);
  const out: React.ReactNode[] = [];
  let bulletBuf: string[] = [];
  const flushBullets = () => {
    if (!bulletBuf.length) return;
    const items = bulletBuf;
    bulletBuf = [];
    out.push(
      <ul key={`ul-${out.length}`} className="list-disc pl-5 space-y-0.5 my-1">
        {items.map((it, k) => <li key={k}>{renderInline(it, `li${out.length}-${k}`)}</li>)}
      </ul>
    );
  };
  lines.forEach((raw, idx) => {
    const line = raw;
    if (/^\s*---+\s*$/.test(line)) {
      flushBullets();
      out.push(<hr key={`hr-${idx}`} className="border-amber-700/40 my-2" />);
      return;
    }
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      flushBullets();
      const level = h[1].length;
      const cls = level === 1 ? "text-[16px] font-bold text-amber-200 mt-1"
        : level === 2 ? "text-[15px] font-semibold text-amber-200 mt-2"
        : "text-[14px] font-semibold text-amber-300 mt-1";
      out.push(<div key={`h-${idx}`} className={cls}>{renderInline(h[2], `h${idx}`)}</div>);
      return;
    }
    const b = line.match(/^\s*[-*]\s+(.+)$/);
    if (b) { bulletBuf.push(b[1]); return; }
    flushBullets();
    if (line.trim() === "") { out.push(<div key={`br-${idx}`} className="h-2" />); return; }
    out.push(<div key={`p-${idx}`}>{renderInline(line, `p${idx}`)}</div>);
  });
  flushBullets();
  return out;
}

function fmtTime(d: string | Date) {
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

const NAME_COLOR: Record<number, string> = {
  1: "text-rose-700",
  2: "text-amber-700",
  3: "text-green-800",
  4: "text-violet-700",
  5: "text-rose-800"
};

type ReportMeta = { kind?: string; reportId?: string; filename?: string; generatedAt?: string };

export default function MessageBubble({ m }: { m: Message }) {
  const COLLAPSE_AT = 600;
  const isLong = m.role === "persona" && m.content.length > COLLAPSE_AT;
  const [expanded, setExpanded] = useState(false);
  const meta = (typeof m.metadata === "object" && m.metadata !== null ? m.metadata : {}) as ReportMeta;
  const isError = meta.kind === "error" || meta.kind === "report_error";
  const isReport = meta.kind === "report" && !!meta.reportId;
  let color = BUBBLE[m.role] ?? BUBBLE.system;
  if (m.role === "persona" && m.personaSlot && PERSONA_BUBBLE[m.personaSlot]) {
    color = PERSONA_BUBBLE[m.personaSlot];
  }
  if (isError) {
    color = "bg-gradient-to-br from-red-100 via-rose-100 to-amber-50 text-red-900 border border-red-300";
  }
  let label: string = LABELS[m.role] ?? m.role;
  if (m.role === "persona") label = m.personaName || (m.personaSlot ? `Persona ${m.personaSlot}` : "Persona");
  if (m.role === "synthesis" && m.roundNumber) label = `Synthese Runde ${m.roundNumber}`;
  if (isError) label = "Fehler";
  let labelColor = "text-stone-800";
  if (m.role === "coordinator") labelColor = "text-rose-700";
  if (m.role === "synthesis") labelColor = "text-amber-700";
  if (m.role === "user") labelColor = "text-orange-700";
  if (m.role === "persona" && m.personaSlot && NAME_COLOR[m.personaSlot]) labelColor = NAME_COLOR[m.personaSlot];
  if (isError) labelColor = "text-red-700";

  return (
    <div className="flex gap-3 items-start group hover:bg-stone-100/50 rounded-xl -mx-2 px-2 py-1 transition-colors">
      <Avatar role={m.role} name={m.personaName} slot={m.personaSlot} sessionId={m.sessionId} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`font-semibold text-[15px] leading-tight ${labelColor}`}>{label}</span>
          <span className="text-xs text-stone-400">{fmtTime(m.createdAt)}</span>
        </div>
        {isReport ? (
          <a href={`/api/reports/${m.sessionId}/${meta.reportId}`}
            className="group/card inline-flex items-center gap-3 rounded-2xl px-4 py-3 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-rose-500/15 border border-amber-500/40 hover:border-amber-400/70 hover:from-amber-500/25 transition-all max-w-full">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center text-white shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="font-medium text-amber-100 truncate">Abschlussbericht</div>
              <div className="text-xs text-amber-300/70 truncate">{meta.filename || "Bericht.pdf"}</div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-amber-200 shrink-0 ml-2 opacity-70 group-hover/card:opacity-100 transition-opacity">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </a>
        ) : (
          <div className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed w-full min-w-0 overflow-hidden [overflow-wrap:anywhere] [word-break:break-word] ${color}`}>
            {m.role === "synthesis" ? renderMarkdown(m.content) : (
              <>
                {(expanded || !isLong ? m.content : m.content.slice(0, COLLAPSE_AT).replace(/\s+\S*$/,"") + " …").split(/\n\n+/).map((para, i, arr) => (
                  <p key={i} className={`whitespace-pre-wrap ${i < arr.length - 1 ? "mb-3" : ""}`}>{para}</p>
                ))}
                {isLong && (
                  <button onClick={() => setExpanded(e => !e)} className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-stone-50 text-stone-900 text-[12px] font-bold shadow-md transition-colors">
                    <span>{expanded ? "Weniger anzeigen" : "Mehr lesen"}</span>
                    <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

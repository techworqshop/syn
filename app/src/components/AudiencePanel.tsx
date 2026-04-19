"use client";
import { useEffect, useRef, useState } from "react";
import type { AudienceMessage, PanelPersona } from "./types";
import PersonaAvatar from "./PersonaAvatar";

type Props = { sessionId: string; slot: number; onClose: () => void };

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

const NAME_COLOR: Record<number, string> = {
  1: "text-rose-300",
  2: "text-amber-300",
  3: "text-emerald-300",
  4: "text-violet-300",
  5: "text-sky-300"
};

function fmtTime(d: string | Date) {
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

export default function AudiencePanel({ sessionId, slot, onClose }: Props) {
  const [msgs, setMsgs] = useState<AudienceMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [persona, setPersona] = useState<PanelPersona | null>(null);
  const displayName = persona?.name || `Slot ${slot}`;
  const initials = (persona?.name ?? "P").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
  const tint = PERSONA_AVATAR[slot] || "bg-gradient-to-br from-indigo-400 to-violet-600";
  const bubbleColor = PERSONA_BUBBLE[slot] + " text-neutral-100";
  const nameColor = NAME_COLOR[slot] || "text-neutral-200";
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/personas`).then(r=>r.json()).then(d=>{
      const found = (d.personas||[]).find((x: PanelPersona) => x.slack_slot === slot);
      if (found) setPersona(found);
    }).catch(()=>{});
    fetch(`/api/sessions/${sessionId}/audience/${slot}`)
      .then(r => r.json()).then(d => setMsgs(d.messages || []));
    const es = new EventSource(`/api/sessions/${sessionId}/stream?slot=${slot}`);
    es.onmessage = (ev) => {
      try {
        const p = JSON.parse(ev.data);
        if (p.type === "audience_message") {
          setMsgs(prev => prev.some(m => m.id === p.message.id) ? prev : [...prev, p.message]);
          if (p.message.role !== "user") setWaiting(false);
        }
      } catch {}
    };
    return () => es.close();
  }, [sessionId, slot]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, waiting]);

  async function send() {
    if (!input.trim() || sending) return;
    setSending(true);
    setWaiting(true);
    const text = input;
    setInput("");
    try {
      await fetch(`/api/sessions/${sessionId}/audience/${slot}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
    } catch { setWaiting(false); }
    finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-[85vh] bg-neutral-950/95 border border-neutral-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <PersonaAvatar sessionId={sessionId} slot={slot} initials={initials} tintClass={tint} />
            <div className="min-w-0">
              <div className={`font-semibold truncate ${nameColor}`}>{displayName}</div>
              <div className="text-xs text-neutral-500 truncate">{persona?.type && persona.type.toLowerCase() !== "human" ? persona.type : "1:1 Interview"}</div>
            </div>
          </div>
          <button onClick={onClose}
            title="Schliessen"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-white/5 transition-colors shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {msgs.length === 0 && (
            <div className="text-neutral-500 text-sm text-center py-12">
              Stell {displayName} deine Frage. Dies ist ein 1:1-Gespraech parallel zur Hauptdiskussion.
            </div>
          )}
          {msgs.map(m => {
            const isUser = m.role === "user";
            return (
              <div key={m.id} className="flex gap-3 items-start group">
                {isUser ? (
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-base font-semibold ring-1 ring-white/10 shrink-0">
                    Du
                  </div>
                ) : (
                  <PersonaAvatar sessionId={sessionId} slot={slot} initials={initials} tintClass={tint} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`font-semibold text-[15px] leading-tight ${isUser ? "text-sky-300" : nameColor}`}>
                      {isUser ? "Du" : displayName}
                    </span>
                    <span className="text-xs text-neutral-600">{fmtTime(m.createdAt)}</span>
                  </div>
                  <div className={`rounded-2xl px-4 py-3 whitespace-pre-wrap text-[14px] leading-relaxed inline-block max-w-full ${
                    isUser
                      ? "bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-500 text-white shadow-[0_6px_20px_-6px_rgba(99,102,241,0.5)]"
                      : bubbleColor
                  }`}>
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })}
          {waiting && (
            <div className="flex items-center gap-2 text-neutral-500 text-sm pl-14">
              <span className="inline-block w-2 h-2 bg-fuchsia-500 rounded-full animate-pulse" />
              <span className="italic">{displayName} denkt nach...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-neutral-800 p-4">
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 focus-within:border-fuchsia-500/50 focus-within:ring-2 focus-within:ring-fuchsia-500/10 transition-all">
            <textarea value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={2}
              placeholder={`Frage an ${displayName}...`}
              className="block w-full px-4 pt-3 pb-1 bg-transparent focus:outline-none resize-none text-[14px] leading-relaxed placeholder:text-neutral-500" />
            <div className="flex items-center justify-end px-2 py-2">
              <button disabled={sending || !input.trim()} onClick={send}
                title="Senden"
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${(!input.trim() || sending) ? "text-neutral-600 bg-neutral-800/50 cursor-not-allowed" : "btn-primary text-white"}`}>
                {sending ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M3.4 20.4 20.85 12.92a1 1 0 0 0 0-1.84L3.4 3.6a1 1 0 0 0-1.39 1.13L4 11l9 1-9 1-1.99 6.27a1 1 0 0 0 1.39 1.13Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

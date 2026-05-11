"use client";
import { useEffect, useRef, useState } from "react";
import type { AudienceMessage, PanelPersona } from "./types";
import PersonaAvatar from "./PersonaAvatar";

type Props = { sessionId: string; slot: number; onClose: () => void };

type Stops = { top: string; bottom: string };
const ACCENT: Record<number, Stops> = {
  1: { top: "#E55260", bottom: "#B82338" },
  2: { top: "#3A7E58", bottom: "#144A2C" },
  3: { top: "#F26A38", bottom: "#C53E0F" },
  4: { top: "#DBA947", bottom: "#A77E22" },
  5: { top: "#913B4F", bottom: "#4F1A28" }
};
const USER_ACCENT: Stops = { top: "#9CCABF", bottom: "#5FA28F" };

function gradStyle(s: Stops) {
  return { background: `linear-gradient(180deg, ${s.top}, ${s.bottom})` } as React.CSSProperties;
}

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
  const stops = ACCENT[slot] || { top: "#888", bottom: "#444" };
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
      <div className="w-full max-w-2xl h-[85vh] bg-[#E8E2D2]/95 border border-stone-300 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header mit Persona-Akzent links als kleiner Verlauf */}
        <div className="relative flex items-center justify-between border-b border-stone-300 px-5 py-3 bg-[#F3EFE2]">
          <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1" style={gradStyle(stops)} />
          <div className="flex items-center gap-3 min-w-0 pl-2">
            <div className="w-10 h-10 rounded-full ring-1 ring-white/40 shrink-0 overflow-hidden" style={gradStyle(stops)}>
              <PersonaAvatar sessionId={sessionId} slot={slot} initials={initials} tintClass="" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate" style={{ color: stops.bottom }}>{displayName}</div>
              <div className="text-xs text-stone-700 font-medium truncate">{persona?.type && persona.type.toLowerCase() !== "human" ? persona.type : "1:1 Interview"}</div>
            </div>
          </div>
          <button onClick={onClose}
            title="Schliessen"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {msgs.length === 0 && (
            <div className="text-stone-700 text-sm text-center py-12 font-medium">
              Stell {displayName} deine Frage. Dies ist ein 1:1-Gespraech parallel zur Hauptdiskussion.
            </div>
          )}
          {msgs.map(m => {
            const isUser = m.role === "user";
            const bubbleStops = isUser ? USER_ACCENT : stops;
            const bubbleStyle = { ['--edge-top' as string]: bubbleStops.top, ['--edge-bottom' as string]: bubbleStops.bottom } as React.CSSProperties;
            return (
              <div key={m.id} className={`flex gap-3 items-start group ${isUser ? "flex-row-reverse" : ""}`}>
                {isUser ? (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ring-1 ring-white/40 shrink-0"
                    style={gradStyle(USER_ACCENT)}>
                    Du
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full ring-1 ring-white/40 shrink-0 overflow-hidden" style={gradStyle(stops)}>
                    <PersonaAvatar sessionId={sessionId} slot={slot} initials={initials} tintClass="" />
                  </div>
                )}
                <div className={`flex-1 min-w-0 flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  <div className={`flex items-baseline gap-2 mb-1 ${isUser ? "flex-row-reverse" : ""}`}>
                    <span className="font-semibold text-[14px] leading-tight" style={{ color: bubbleStops.bottom }}>
                      {isUser ? "Du" : displayName}
                    </span>
                    <span className="text-xs text-stone-500">{fmtTime(m.createdAt)}</span>
                  </div>
                  <div className={`bubble-card ${isUser ? "bubble-card-right" : ""} py-3 whitespace-pre-wrap text-[14px] leading-relaxed max-w-[75%] [overflow-wrap:anywhere] [word-break:break-word]`}
                    style={bubbleStyle}>
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })}
          {waiting && (
            <div className="flex items-center gap-2 text-stone-500 text-sm pl-14">
              <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: stops.bottom }} />
              <span className="italic">{displayName} denkt nach...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-stone-300 p-4 bg-[#F3EFE2]">
          <div className="rounded-2xl border border-stone-300 bg-white/75 focus-within:border-emerald-700/50 focus-within:ring-2 focus-within:ring-emerald-700/10 transition-all">
            <textarea value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={2}
              placeholder={`Frage an ${displayName}...`}
              className="block w-full px-4 pt-3 pb-1 bg-transparent focus:outline-none resize-none text-[14px] leading-relaxed placeholder:text-stone-500" />
            <div className="flex items-center justify-end px-2 py-2">
              <button disabled={sending || !input.trim()} onClick={send}
                title="Senden"
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${(!input.trim() || sending) ? "text-stone-400 bg-stone-200/50 cursor-not-allowed" : "btn-primary text-white"}`}>
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

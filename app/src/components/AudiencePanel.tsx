"use client";
import { useEffect, useRef, useState } from "react";
import type { AudienceMessage, PanelPersona } from "./types";
import PersonaAvatar from "./PersonaAvatar";

type Props = { sessionId: string; slot: number; onClose: () => void };

const PERSONA_BUBBLE: Record<number, string> = {
  1: "bg-gradient-to-br from-orange-700 via-red-700 to-orange-800 text-white border border-orange-600 shadow-md bubble-glass",
  2: "bg-gradient-to-br from-yellow-600 via-amber-600 to-orange-700 text-white border border-amber-500 shadow-md bubble-glass",
  3: "bg-gradient-to-br from-lime-700 via-green-600 to-emerald-700 text-white border border-lime-500 shadow-md bubble-glass",
  4: "bg-gradient-to-br from-amber-900 via-orange-950 to-red-950 text-white border border-amber-700 shadow-md bubble-glass",
  5: "bg-gradient-to-br from-red-800 via-orange-900 to-amber-900 text-white border border-red-700 shadow-md bubble-glass"
};

const PERSONA_AVATAR: Record<number, string> = {
  1: "bg-gradient-to-br from-orange-600 to-red-800",
  2: "bg-gradient-to-br from-yellow-500 to-orange-700",
  3: "bg-gradient-to-br from-lime-600 to-emerald-800",
  4: "bg-gradient-to-br from-amber-800 to-red-950",
  5: "bg-gradient-to-br from-red-700 to-amber-900"
};

const NAME_COLOR: Record<number, string> = {
  1: "text-orange-800",
  2: "text-amber-800",
  3: "text-green-800",
  4: "text-amber-950",
  5: "text-red-800"
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
  const tint = PERSONA_AVATAR[slot] || "bg-gradient-to-br from-rose-400 to-amber-500";
  const bubbleColor = PERSONA_BUBBLE[slot] + " text-stone-900";
  const nameColor = NAME_COLOR[slot] || "text-stone-800";
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
      <div className="w-full max-w-2xl h-[85vh] bg-amber-50/95 border border-stone-300 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-stone-300 px-5 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <PersonaAvatar sessionId={sessionId} slot={slot} initials={initials} tintClass={tint} />
            <div className="min-w-0">
              <div className={`font-semibold truncate ${nameColor}`}>{displayName}</div>
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
            return (
              <div key={m.id} className="flex gap-3 items-start group">
                {isUser ? (
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center text-white text-base font-semibold ring-1 ring-white/10 shrink-0">
                    Du
                  </div>
                ) : (
                  <PersonaAvatar sessionId={sessionId} slot={slot} initials={initials} tintClass={tint} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`font-semibold text-[15px] leading-tight ${isUser ? "text-amber-800" : nameColor}`}>
                      {isUser ? "Du" : displayName}
                    </span>
                    <span className="text-xs text-stone-400">{fmtTime(m.createdAt)}</span>
                  </div>
                  <div className={`rounded-2xl px-4 py-3 whitespace-pre-wrap text-[14px] leading-relaxed w-full min-w-0 overflow-hidden [overflow-wrap:anywhere] [word-break:break-word] ${
                    isUser
                      ? "bg-gradient-to-br from-amber-700 via-orange-700 to-yellow-700 text-white shadow-[0_6px_20px_-6px_rgba(180,120,40,0.5)]"
                      : bubbleColor
                  }`}>
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })}
          {waiting && (
            <div className="flex items-center gap-2 text-stone-500 text-sm pl-14">
              <span className="inline-block w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
              <span className="italic">{displayName} denkt nach...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-stone-300 p-4">
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

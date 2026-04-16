"use client";
import { useEffect, useRef, useState } from "react";
import type { AudienceMessage } from "./types";
import { PERSONA_NAMES } from "./types";

type Props = { sessionId: string; slot: number; onClose: () => void };

export default function AudiencePanel({ sessionId, slot, onClose }: Props) {
  const [msgs, setMsgs] = useState<AudienceMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/audience/${slot}`)
      .then(r => r.json()).then(d => setMsgs(d.messages || []));
    const es = new EventSource(`/api/sessions/${sessionId}/stream?slot=${slot}`);
    es.onmessage = (ev) => {
      try {
        const p = JSON.parse(ev.data);
        if (p.type === "audience_message") {
          setMsgs(prev => prev.some(m => m.id === p.message.id) ? prev : [...prev, p.message]);
        }
      } catch {}
    };
    return () => es.close();
  }, [sessionId, slot]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  async function send() {
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input;
    setInput("");
    try {
      await fetch(`/api/sessions/${sessionId}/audience/${slot}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
    } finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl h-[80vh] bg-neutral-950 border border-neutral-800 rounded-lg flex flex-col">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <div>
            <div className="font-semibold">{PERSONA_NAMES[slot]}</div>
            <div className="text-xs text-neutral-500">1:1 Interview (parallel zur Diskussion)</div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-100">Schliessen</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {msgs.length === 0 && (
            <div className="text-neutral-500 text-sm text-center py-8">
              Stell {PERSONA_NAMES[slot]} deine Frage.
            </div>
          )}
          {msgs.map(m => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-2 whitespace-pre-wrap ${m.role === "user" ? "bg-sky-600" : "bg-neutral-800 border border-neutral-700"}`}>
                {m.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-neutral-800 p-3 flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={`Frage an ${PERSONA_NAMES[slot]}...`}
            className="flex-1 px-3 py-2 rounded bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-sky-500" />
          <button disabled={sending || !input.trim()} onClick={send}
            className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50">
            {sending ? "..." : "Senden"}
          </button>
        </div>
      </div>
    </div>
  );
}

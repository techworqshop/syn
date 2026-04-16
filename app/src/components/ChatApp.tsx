"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Message, SessionRow } from "./types";
import MessageBubble from "./MessageBubble";
import PersonaSidebar from "./PersonaSidebar";
import AudiencePanel from "./AudiencePanel";

type Props = {
  sessionId: string;
  session: SessionRow;
  initialMessages: Message[];
};

export default function ChatApp({ sessionId, session, initialMessages }: Props) {
  const [msgs, setMsgs] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [waiting, setWaiting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource(`/api/sessions/${sessionId}/stream`);
    es.onmessage = (ev) => {
      try {
        const p = JSON.parse(ev.data);
        if (p.type === "message") {
          setMsgs(prev => prev.some(m => m.id === p.message.id) ? prev : [...prev, p.message]);
          if (p.message.role !== "user") setWaiting(false);
        }
      } catch {}
    };
    return () => es.close();
  }, [sessionId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, waiting]);

  async function send() {
    if (!input.trim() || sending) return;
    setSending(true);
    setWaiting(true);
    const text = input;
    setInput("");
    try {
      await fetch(`/api/sessions/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
    } catch {
      setWaiting(false);
    } finally { setSending(false); }
  }

  return (
    <div className="flex h-[calc(100vh-57px)] -mt-6 -mx-6">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-neutral-800 px-6 py-3 flex items-center justify-between">
          <div>
            <div className="font-medium">{session.title}</div>
            <div className="text-xs text-neutral-500">
              Status: {session.status} - Runde {session.currentRound} - {session.personaCount} Personas
            </div>
          </div>
          <Link href="/app/dashboard" className="text-sm text-neutral-400 hover:text-neutral-100">
            Alle Sessions
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {msgs.length === 0 && (
            <div className="text-neutral-500 text-center py-12">
              Starte die Fokusgruppe. Beschreib dein Thema, und Syn fuehrt dich durch den Prozess.
            </div>
          )}
          {msgs.map(m => <MessageBubble key={m.id} m={m} />)}
          {waiting && (
            <div className="flex items-center gap-2 text-neutral-500 text-sm">
              <span className="inline-block w-2 h-2 bg-sky-500 rounded-full animate-pulse" />
              <span>Syn denkt nach...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-neutral-800 p-4 flex gap-2">
          <textarea value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={2}
            placeholder="Nachricht an Syn..."
            className="flex-1 px-3 py-2 rounded bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-sky-500 resize-none" />
          <button disabled={sending || !input.trim()} onClick={send}
            className="px-6 py-2 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 self-end">
            {sending ? "..." : "Senden"}
          </button>
        </div>
      </div>
      <PersonaSidebar onSelect={setOpenSlot} />
      {openSlot != null && (
        <AudiencePanel sessionId={sessionId} slot={openSlot} onClose={() => setOpenSlot(null)} />
      )}
    </div>
  );
}

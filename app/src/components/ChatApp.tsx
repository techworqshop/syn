"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Message, SessionRow, FileRow } from "./types";
import UploadModal from "./UploadModal";
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
  const [refreshToken, setRefreshToken] = useState(0);
  const [filesList, setFilesList] = useState<FileRow[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource(`/api/sessions/${sessionId}/stream`);
    es.onmessage = (ev) => {
      try {
        const p = JSON.parse(ev.data);
        if (p.type === "message") {
          setMsgs(prev => prev.some(m => m.id === p.message.id) ? prev : [...prev, p.message]);
          if (p.message.role !== "user") { setWaiting(false); setRefreshToken(t => t + 1); }
        }
      } catch {}
    };
    return () => es.close();
  }, [sessionId]);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/files`).then(r => r.json()).then(d => setFilesList(d.files || [])).catch(() => {});
  }, [sessionId, refreshToken]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, waiting]);


  async function deleteFile(id: string) {
    const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
    if (res.ok) setFilesList(prev => prev.filter(f => f.id !== id));
  }

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
    } catch { setWaiting(false); }
    finally { setSending(false); }
  }


  return (
    <div className="flex flex-1 min-h-0 overflow-hidden"
      >
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="border-b border-neutral-800 px-6 py-3 flex items-center justify-between">
          <div>
            <div className="font-medium">{session.title}</div>
            <div className="text-xs text-neutral-500">
              {session.status} - Runde {session.currentRound} - {session.personaCount} Personas - {filesList.length} Dateien
            </div>
          </div>
          <Link href="/app/dashboard" className="text-sm text-neutral-400 hover:text-neutral-100">Alle Sessions</Link>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {msgs.length === 0 && (
            <div className="text-neutral-500 text-center py-12">
              Starte die Fokusgruppe. Beschreib dein Thema (du kannst auch Dateien reinziehen), und Syn fuehrt dich durch.
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
        {(filesList.length > 0) && (
          <div className="border-t border-neutral-800 px-4 py-2 flex flex-wrap gap-2 text-xs">
            {filesList.map(f => (
              <div key={f.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${f.category === "briefing" ? "bg-amber-950/30 border-amber-700/50 text-amber-100" : f.category === "persona" ? "bg-rose-950/30 border-rose-700/50 text-rose-100" : "bg-sky-950/30 border-sky-700/50 text-sky-100"}`}>
                <span className="text-[10px] uppercase tracking-wide opacity-70">{f.category === "briefing" ? "Briefing" : f.category === "persona" ? "Persona" : "Panel"}</span>
                <span className="max-w-[200px] truncate">{f.fileName}</span>
                <span className="opacity-60">{Math.round(f.sizeBytes/1024)}K</span>
                {f.summary ? <span className="text-emerald-400">✓</span> : <span className="opacity-60">…</span>}
                <button onClick={() => deleteFile(f.id)} className="ml-1 opacity-50 hover:opacity-100 hover:text-red-400 transition-opacity" title="Datei loeschen">×</button>
              </div>
            ))}
          </div>
        )}
        <div className="border-t border-neutral-800 p-4 flex gap-2 items-end">
          <button onClick={() => setShowUpload(true)} className="px-4 py-2 rounded-lg border border-white/10 bg-neutral-900 hover:bg-neutral-800 text-sm text-neutral-200 whitespace-nowrap transition-colors" title="Dateien hochladen">Dateien</button>
          <textarea value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={2}
            placeholder="Nachricht an Syn..."
            className="flex-1 px-3 py-2 rounded bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-sky-500 resize-none" />
          <button disabled={sending || !input.trim()} onClick={send}
            className="px-6 py-2 rounded btn-primary disabled:opacity-50">
            {sending ? "..." : "Senden"}
          </button>
        </div>
      </div>
      <PersonaSidebar sessionId={sessionId} refreshToken={refreshToken} onSelect={setOpenSlot} />
      {openSlot != null && (
        <AudiencePanel sessionId={sessionId} slot={openSlot} onClose={() => setOpenSlot(null)} />
      )}
      {showUpload && (
        <UploadModal sessionId={sessionId} onClose={() => setShowUpload(false)} onUploaded={f => setFilesList(prev => [...prev, f])} />
      )}
    </div>
  );
}

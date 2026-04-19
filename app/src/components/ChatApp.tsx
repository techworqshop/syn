"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Message, SessionRow, FileRow } from "./types";
import UploadModal from "./UploadModal";
import MessageBubble from "./MessageBubble";
import PersonaSidebar from "./PersonaSidebar";
import AudiencePanel from "./AudiencePanel";
import SessionMenu from "./SessionMenu";

type Props = {
  sessionId: string;
  session: SessionRow;
  initialMessages: Message[];
};

export default function ChatApp({ sessionId, session, initialMessages }: Props) {
  const [msgs, setMsgs] = useState<Message[]>(initialMessages);
  const [title, setTitle] = useState<string>(session.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(session.title);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [personaCount, setPersonaCount] = useState<number>(session.personaCount);
  const [currentRound, setCurrentRound] = useState<number>(session.currentRound);
  const [refreshToken, setRefreshToken] = useState(0);
  const [filesList, setFilesList] = useState<FileRow[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource(`/api/sessions/${sessionId}/stream`);
    es.onmessage = (ev) => {
      try {
        const p = JSON.parse(ev.data);
        if (p.type === "session") {
          if (typeof p.title === "string") { setTitle(p.title); setTitleDraft(p.title); }
          if (typeof p.personaCount === "number") setPersonaCount(p.personaCount);
          if (typeof p.currentRound === "number") setCurrentRound(p.currentRound);
          return;
        }
        if (p.type === "status") {
          if (typeof p.text === "string" && p.text.trim()) {
            setStatus(p.text);
            setWaiting(true);
          }
          return;
        }
        if (p.type === "persona_image") {
          setRefreshToken(t => t + 1);
          return;
        }
        if (p.type === "message") {
          setMsgs(prev => prev.some(m => m.id === p.message.id) ? prev : [...prev, p.message]);
          if (p.message.role !== "user") { setWaiting(false); setStatus(null); setRefreshToken(t => t + 1); }
        }
      } catch {}
    };
    return () => es.close();
  }, [sessionId]);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/files`).then(r => r.json()).then(d => setFilesList(d.files || [])).catch(() => {});
  }, [sessionId, refreshToken]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, waiting]);


  async function saveTitle() {
    const trimmed = titleDraft.trim();
    setEditingTitle(false);
    if (!trimmed || trimmed === title) { setTitleDraft(title); return; }
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed })
    });
    if (res.ok) { setTitle(trimmed); }
    else { setTitleDraft(title); }
  }

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
            {editingTitle ? (
              <input autoFocus value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { saveTitle(); }
                  if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(title); }
                }}
                onBlur={saveTitle}
                className="font-medium bg-transparent border-b border-fuchsia-500/60 focus:outline-none" />
            ) : (
              <button onClick={() => setEditingTitle(true)}
                className="font-medium hover:text-fuchsia-300 transition-colors text-left"
                title="Klick zum Umbenennen">{title}</button>
            )}
            <div className="text-xs text-neutral-500">
              {session.status} - Runde {currentRound} - {personaCount} Personas - {filesList.length} Dateien
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/app/dashboard" className="text-sm text-neutral-400 hover:text-neutral-100">Alle Sessions</Link>
            <SessionMenu sessionId={sessionId} afterDelete={() => window.location.href = "/app/dashboard"} />
          </div>
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
              <span className="inline-block w-2 h-2 bg-fuchsia-500 rounded-full animate-pulse" />
              <span className="italic">{status || "Syn denkt nach..."}</span>
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
        <div className="border-t border-neutral-800 p-4">
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 focus-within:border-fuchsia-500/50 focus-within:ring-2 focus-within:ring-fuchsia-500/10 transition-all">
            <textarea value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={2}
              placeholder="Nachricht an Syn..."
              className="block w-full px-4 pt-3 pb-1 bg-transparent focus:outline-none resize-none text-[14px] leading-relaxed placeholder:text-neutral-500" />
            <div className="flex items-center justify-between px-2 py-2">
              <button onClick={() => setShowUpload(true)}
                title="Dateien hochladen"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-white/5 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 0 1 17.99 8.85L9.42 17.42a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
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

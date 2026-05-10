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

  // Fokusgruppe ist abgeschlossen sobald Runde 3 durch ist ODER ein Report existiert.
  const hasReport = msgs.some(m => {
    const md = (typeof m.metadata === "object" && m.metadata !== null ? m.metadata : {}) as { kind?: string };
    return md.kind === "report" || md.kind === "report_text";
  });
  const isClosed = currentRound >= 3 || hasReport;

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
          setRefreshToken(t => t + 1);
          return;
        }
        if (p.type === "persona_image" || p.type === "panel_refresh") {
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
    if (!input.trim() || sending || waiting) return;
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
        <div className="relative z-30 border-b border-white/40 px-6 py-3 glass flex items-center justify-between">
          <div>
            {editingTitle ? (
              <input autoFocus value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { saveTitle(); }
                  if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(title); }
                }}
                onBlur={saveTitle}
                className="font-medium bg-transparent border-b border-amber-700/60 focus:outline-none" />
            ) : (
              <button onClick={() => setEditingTitle(true)}
                className="font-medium hover:text-emerald-700 transition-colors text-left"
                title="Klick zum Umbenennen">{title}</button>
            )}
            <div className="text-xs text-stone-500">
              {isClosed
                ? <><span className="text-emerald-700 font-semibold">Runde 3 abgeschlossen</span> · {personaCount} Personas · {filesList.length} Dateien</>
                : <>Runde {currentRound} · {personaCount} Personas · {filesList.length} Dateien</>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/app/dashboard" className="text-sm text-stone-600 hover:text-stone-900">Alle Sessions</Link>
            <SessionMenu sessionId={sessionId} afterDelete={() => window.location.href = "/app/dashboard"} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {msgs.length === 0 && (
            <div className="text-stone-500 text-center py-12">
              Starte die Fokusgruppe. Beschreib dein Thema (du kannst auch Dateien reinziehen), und Syn fuehrt dich durch.
            </div>
          )}
          {msgs.map(m => <MessageBubble key={m.id} m={m} />)}
          {waiting && (
            <div className="flex items-center gap-2 text-stone-500 text-sm">
              <span className="inline-block w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
              <span className="italic">{status || "Syn denkt nach..."}</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        {(filesList.length > 0) && (
          <div className="border-t border-white/40 px-4 py-2 flex flex-wrap gap-2 text-xs backdrop-blur-md bg-white/20">
            {filesList.map(f => (
              <div key={f.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${f.category === "briefing" ? "bg-yellow-200 border-yellow-600 text-yellow-950 shadow-sm" : f.category === "persona" ? "bg-lime-200 border-lime-600 text-lime-950 shadow-sm" : "bg-orange-200 border-orange-700 text-orange-950 shadow-sm"}`}>
                <span className="text-[10px] uppercase tracking-wide opacity-70">{f.category === "briefing" ? "Briefing" : f.category === "persona" ? "Persona" : "Panel"}</span>
                <span className="max-w-[200px] truncate">{f.fileName}</span>
                <span className="opacity-60">{Math.round(f.sizeBytes/1024)}K</span>
                {f.summary ? <span className="text-emerald-700 font-bold">✓</span> : <span className="opacity-60">…</span>}
                <button onClick={() => deleteFile(f.id)} className="ml-1 opacity-50 hover:opacity-100 hover:text-red-400 transition-opacity" title="Datei loeschen">×</button>
              </div>
            ))}
          </div>
        )}
        {isClosed ? (
          <div className="border-t border-white/40 p-4 backdrop-blur-md bg-white/40">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-700/40 p-4 shadow-sm flex gap-3 items-start">
              <svg viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mt-0.5 shrink-0">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <div className="text-sm leading-relaxed text-stone-800">
                <div className="font-semibold text-emerald-800 mb-1">Diskussion abgeschlossen</div>
                Der Haupt-Chat ist beendet. Du kannst weiterhin:
                <ul className="list-disc pl-5 mt-1.5 space-y-0.5 text-stone-700">
                  <li>Den <span className="font-semibold text-stone-900">Abschlussbericht</span> ueber das <span className="font-semibold">3-Punkte-Menue</span> rechts oben generieren (Text-Bubble + PDF-Download)</li>
                  <li>Einzelne Personas in der Sidebar anklicken und im <span className="font-semibold">1:1-Chat</span> weiter befragen</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
        <div className="border-t border-white/40 p-4 backdrop-blur-md bg-white/30">
          <div className="rounded-2xl glass-card focus-within:border-rose-400/60 focus-within:ring-2 focus-within:ring-rose-400/15 transition-all">
            <textarea value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!waiting && !sending) send(); } }}
              rows={2}
              placeholder={waiting ? "Syn arbeitet — du kannst schon vorschreiben, senden geht gleich wieder ..." : "Nachricht an Syn..."}
              className="block w-full px-4 pt-3 pb-1 bg-transparent focus:outline-none resize-none text-[14px] leading-relaxed placeholder:text-stone-500" />
            <div className="flex items-center justify-between px-2 py-2">
              <button onClick={() => setShowUpload(true)}
                title="Dateien hochladen"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 0 1 17.99 8.85L9.42 17.42a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <button disabled={sending || waiting || !input.trim()} onClick={send}
                title="Senden"
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${(!input.trim() || sending || waiting) ? "text-stone-400 bg-stone-200/50 cursor-not-allowed" : "btn-primary text-white"}`}>
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
        )}
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

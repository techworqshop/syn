"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Message, SessionRow, FileRow } from "./types";
import UploadModal from "./UploadModal";
import MessageBubble from "./MessageBubble";
import PersonaSidebar from "./PersonaSidebar";
import AudiencePanel from "./AudiencePanel";
import SessionMenu from "./SessionMenu";
import { t, type Locale } from "@/lib/i18n";

type Props = {
  sessionId: string;
  session: SessionRow;
  initialMessages: Message[];
  locale?: Locale;
  subLocked?: boolean;
};

export default function ChatApp({ sessionId, session, initialMessages, locale = "de", subLocked = false }: Props) {
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
  const [personaRoleBySlot, setPersonaRoleBySlot] = useState<Record<number, string>>({});
  const [personaNameBySlot, setPersonaNameBySlot] = useState<Record<number, string>>({});
  const [refreshToken, setRefreshToken] = useState(0);

  // Load persona slot→role map for inline labels in MessageBubble headers.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sessions/${session.id}/personas`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (cancelled || !d?.personas) return;
        const map: Record<number, string> = {};
        const nameMap: Record<number, string> = {};
        for (const p of d.personas) {
          if (typeof p.slack_slot === "number") {
            if (typeof p.type === "string" && p.type.trim()) map[p.slack_slot] = p.type.trim();
            if (typeof p.name === "string" && p.name.trim()) nameMap[p.slack_slot] = p.name.trim();
          }
        }
        setPersonaRoleBySlot(map);
        setPersonaNameBySlot(nameMap);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [session.id, personaCount, refreshToken]);
  const [currentRound, setCurrentRound] = useState<number>(session.currentRound);
  const [filesList, setFilesList] = useState<FileRow[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow textarea: 2 rows min, 5 rows max, scroll after.
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    // line-height ~22.75px @ text-[14px] leading-relaxed; padding pt-3 (12) + pb-1 (4) = 16
    const lineH = 22.75;
    const maxH = Math.round(5 * lineH + 16); // 5 lines + padding
    el.style.height = Math.min(el.scrollHeight, maxH) + "px";
  }, [input]);

  // Fokusgruppe ist abgeschlossen sobald Runde 3 durch ist ODER ein Report existiert.
  const hasReport = msgs.some(m => {
    const md = (typeof m.metadata === "object" && m.metadata !== null ? m.metadata : {}) as { kind?: string };
    return md.kind === "report" || md.kind === "report_text";
  });
  // Report einmalig: sobald angestossen (auch nur report_status) ist der
  // "Abschlussbericht erstellen"-Menuepunkt weg — kein doppeltes Generieren.
  const reportTriggered = msgs.some(m => {
    const md = (typeof m.metadata === "object" && m.metadata !== null ? m.metadata : {}) as { kind?: string };
    return md.kind === "report" || md.kind === "report_text" || md.kind === "report_status";
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
          // status is ephemeral text; nichts an Personas/Files aendert sich.
          // Kein refreshToken-Bump -> kein /personas refetch -> kein ReadState-Spam.
          return;
        }
        if (p.type === "persona_image" || p.type === "panel_refresh") {
          setRefreshToken(t => t + 1);
          return;
        }
        if (p.type === "message") {
          setMsgs(prev => {
            if (prev.some(m => m.id === p.message.id)) return prev;
            if (p.message.role === "user") {
              const idx = prev.findIndex(m => m.role === "user" && typeof m.id === "string" && m.id.startsWith("tmp-") && m.content === p.message.content);
              if (idx >= 0) {
                const copy = prev.slice();
                copy[idx] = p.message;
                return copy;
              }
            }
            return [...prev, p.message];
          });
          if (p.message.role !== "user") {
            const md = (typeof p.message.metadata === "object" && p.message.metadata !== null ? p.message.metadata : {}) as { kind?: string };
            // panel_committed/round_starting bubbles signal "round is about to fire" -
            // keep the typing indicator ON so user sees something is still happening.
            if (md.kind !== "panel_committed") { setWaiting(false); setStatus(null); }
            setRefreshToken(t => t + 1);
          }
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
    if (res.ok) { setFilesList(prev => prev.filter(f => f.id !== id)); return; }
    try {
      const d = await res.json();
      if (d?.error) alert(d.error);
    } catch {}
  }

  async function send() {
    if (!input.trim() || sending || waiting || subLocked) return;
    setSending(true);
    setWaiting(true);
    const text = input;
    setInput("");
    const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: Message = {
      id: tmpId,
      sessionId,
      role: "user",
      personaSlot: null,
      personaName: null,
      content: text,
      roundNumber: null,
      metadata: { optimistic: true },
      createdAt: new Date().toISOString()
    };
    setMsgs(prev => [...prev, optimistic]);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const j = await res.json().catch(() => null) as { messageId?: string } | null;
        if (j?.messageId) {
          setMsgs(prev => prev.map(m => m.id === tmpId ? { ...m, id: j.messageId! } : m));
        }
      } else {
        setMsgs(prev => prev.filter(m => m.id !== tmpId));
        setWaiting(false);
      }
    } catch {
      setMsgs(prev => prev.filter(m => m.id !== tmpId));
      setWaiting(false);
    }
    finally { setSending(false); }
  }


  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <PersonaSidebar sessionId={sessionId} refreshToken={refreshToken} onSelect={setOpenSlot} locale={locale} />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="relative z-30 border-b border-white/40 px-6 py-1.5 glass flex items-center justify-between">
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
                className="font-medium hover:text-rose-700 transition-colors text-left"
                title={locale === "en" ? "Click to rename" : "Klick zum Umbenennen"}>{title}</button>
            )}
            <div className="text-xs text-stone-500">
              {isClosed
                ? <><span className="font-semibold" style={{ color: "#9F1239" }}>{t("chat.round3Done", locale)}</span> · {personaCount} {t("chat.personasShort", locale)} · {filesList.length} {t("chat.filesShort", locale)}</>
                : currentRound >= 1
                ? <>{t("chat.round", locale)} {currentRound} · {personaCount} {t("chat.personasShort", locale)} · {filesList.length} {t("chat.filesShort", locale)}</>
                : msgs.some(m => m.role === "user")
                ? <><span className="font-semibold" style={{ color: "#3A7E58" }}>{locale === "en" ? "Discussion started" : "Diskussion laeuft"}</span> · {personaCount} {t("chat.personasShort", locale)} · {filesList.length} {t("chat.filesShort", locale)}</>
                : <><span style={{ color: "#7A7268" }}>{locale === "en" ? "Setup" : "Setup"}</span> · {filesList.length} {t("chat.filesShort", locale)}</>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/app/dashboard" className="text-sm text-stone-600 hover:text-stone-900">{t("chat.allSessions", locale)}</Link>
            <SessionMenu sessionId={sessionId} afterDelete={() => window.location.href = "/app/dashboard"} locale={locale} showFinalReport={!reportTriggered} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {msgs.length === 0 && (
            <div className="text-stone-500 text-center py-12">
              {t("chat.empty", locale)}
            </div>
          )}
          {msgs.map(m => <MessageBubble key={m.id} m={m} locale={locale} personaRole={m.personaSlot != null ? (personaRoleBySlot[m.personaSlot] ?? null) : null} personaName={m.personaSlot != null ? (personaNameBySlot[m.personaSlot] ?? null) : null} />)}
          {waiting && (
            <div className="flex items-center gap-2 text-stone-500 text-sm">
              <span className="inline-block w-2 h-2 bg-rose-700 rounded-full animate-pulse" />
              <span className="italic">{status || t("chat.thinking", locale)}</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        {(filesList.length > 0) && (
          <div className="border-t border-white/40 px-4 py-2 flex flex-wrap gap-2 text-xs backdrop-blur-md bg-white/20">
            {filesList.map(f => (
              <div key={f.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${f.category === "briefing" ? "bg-yellow-200 border-yellow-600 text-yellow-950 shadow-sm" : f.category === "persona" ? "bg-emerald-900/15 border-emerald-900/60 text-emerald-950 shadow-sm" : "bg-orange-200 border-orange-700 text-orange-950 shadow-sm"}`}>
                <span className="text-[10px] uppercase tracking-wide opacity-70">{f.category === "briefing" ? "Briefing" : f.category === "persona" ? "Persona" : "Panel"}</span>
                <span className="max-w-[200px] truncate">{f.fileName}</span>
                <span className="opacity-60">{Math.round(f.sizeBytes/1024)}K</span>
                {f.summary ? <span className="text-rose-700 font-bold">✓</span> : <span className="opacity-60">…</span>}
                {f.locked
                  ? <span className="ml-1 opacity-50" title="Datei gesperrt — nach Abschicken nicht mehr loeschbar">🔒</span>
                  : <button onClick={() => deleteFile(f.id)} className="ml-1 opacity-50 hover:opacity-100 hover:text-red-400 transition-opacity" title="Datei loeschen">×</button>}
              </div>
            ))}
          </div>
        )}
        {subLocked ? (
          <div className="border-t border-white/40 px-3 py-2 backdrop-blur-md bg-white/40">
            <div className="relative rounded-md bg-rose-50 border border-rose-300 px-3 py-3 pl-4 shadow-sm flex flex-wrap gap-3 items-center text-sm overflow-hidden">
              <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1" style={{ background: "#9F1239" }} />
              <span className="font-semibold" style={{ color: "#9F1239" }}>
                {locale === "en" ? "Subscription inactive" : "Abo inaktiv"}
              </span>
              <span style={{ color: "#7A4E13" }}>
                {locale === "en" ? "Re-activate to continue this discussion." : "Reaktiviere dein Abo, um diese Diskussion weiterzufuehren."}
              </span>
              <a href="/app/billing" className="ml-auto px-3 py-1.5 rounded-md text-xs font-semibold btn-primary text-white">
                {locale === "en" ? "Manage plan" : "Abo verwalten"}
              </a>
            </div>
          </div>
        ) : isClosed ? (
          <div className="border-t border-white/40 px-3 py-2 backdrop-blur-md bg-white/40">
            <div className="relative rounded-md bg-[#F3EFE2] border border-stone-300 px-3 py-2 pl-4 shadow-sm flex gap-2 items-center text-xs overflow-hidden">
              <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1"
                style={{ background: "linear-gradient(180deg, #4C1D95, #BE123C)" }} />
              <svg viewBox="0 0 24 24" fill="none" stroke="#9F1239" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span className="font-semibold" style={{ color: "#9F1239" }}>{t("chat.closed.title", locale)}</span>
              <span className="text-stone-700">{t(reportTriggered ? "chat.closed.hintDone" : "chat.closed.hint", locale)}</span>
            </div>
          </div>
        ) : (
        <div className="border-t border-white/40 px-4 py-2 backdrop-blur-md bg-white/30">
          <div className="rounded-md glass-card focus-within:border-rose-400/60 focus-within:ring-2 focus-within:ring-rose-400/15 transition-all">
            <textarea value={input}
              ref={taRef}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!waiting && !sending) send(); } }}
              rows={1}
              placeholder={waiting ? t("chat.placeholder.busy", locale) : t("chat.placeholder.idle", locale)}
              className="block w-full px-4 pt-3 pb-1 bg-transparent focus:outline-none resize-none text-[14px] leading-relaxed placeholder:text-stone-500 overflow-y-auto" />
            <div className="flex items-center justify-between px-2 py-2">
              {currentRound < 1 ? (
              <button onClick={() => setShowUpload(true)}
                title={t("chat.upload", locale)}
                className="w-9 h-9 rounded-md flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 0 1 17.99 8.85L9.42 17.42a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              ) : <span className="w-9 h-9" aria-hidden />}
              <button disabled={sending || waiting || !input.trim()} onClick={send}
                title={t("chat.send", locale)}
                className={`w-9 h-9 rounded-md flex items-center justify-center transition-all ${(!input.trim() || sending || waiting) ? "text-stone-400 bg-stone-200/50 cursor-not-allowed" : "btn-primary text-white"}`}>
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
      {openSlot != null && (
        <AudiencePanel sessionId={sessionId} slot={openSlot} onClose={() => setOpenSlot(null)} />
      )}
      {showUpload && (
        <UploadModal sessionId={sessionId} onClose={() => setShowUpload(false)} onUploaded={f => setFilesList(prev => [...prev, f])} locale={locale} existingCount={filesList.length} />
      )}
    </div>
  );
}

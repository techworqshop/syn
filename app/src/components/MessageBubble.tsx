"use client";
import type React from "react";
import { useState } from "react";
import type { Message } from "./types";
import PersonaAvatar from "./PersonaAvatar";
import { t, type Locale } from "@/lib/i18n";

const LABELS: Record<string, string> = {
  // Wird auf Anfrage von t() ueberschrieben (locale-aware in der Komponente)
  user: "Du",
  coordinator: "Syn",
  persona: "Persona",
  synthesis: "Synthese",
  system: "System"
};

// ============================================================
// Aura-Palette: vertikale Color-Color Gradienten
//   - Edge-Accent-Streifen an der Bubble-Außenkante
//   - Avatar-Kreis
// jeweils [top, bottom] -- top heller, bottom dunkler/sattere
// ============================================================
type Stops = { top: string; bottom: string };

const PERSONA_ACCENT: Record<number, Stops> = {
  1: { top: "#E55260", bottom: "#B82338" }, // Crimson
  2: { top: "#3A7E58", bottom: "#144A2C" }, // Deep Emerald
  3: { top: "#F26A38", bottom: "#C53E0F" }, // Orange Glow
  4: { top: "#DBA947", bottom: "#A77E22" }, // Mustard
  5: { top: "#913B4F", bottom: "#4F1A28" }  // Bordeaux
};

const ROLE_ACCENT: Record<string, Stops> = {
  user:        { top: "#9CCABF", bottom: "#5FA28F" }, // Mint Teal
  coordinator: { top: "#4C1D95", bottom: "#BE123C" }, // Syn-Brand (Purple -> Rose)
  synthesis:   { top: "#B45309", bottom: "#78350F" }, // Amber
  system:      { top: "#A8A29E", bottom: "#57534E" }  // Neutral
};

function accentFor(role: string, slot?: number | null): Stops {
  if (role === "persona" && slot && PERSONA_ACCENT[slot]) return PERSONA_ACCENT[slot];
  return ROLE_ACCENT[role] ?? ROLE_ACCENT.system;
}

function Avatar({ role, name, slot, sessionId, locale = "de" }: { role: string; name?: string | null; slot?: number | null; sessionId?: string | null; locale?: Locale }) {
  if (role === "coordinator") {
    return (
      <img src="/api/assets/syn-avatar" alt="Syn"
        className="w-10 h-10 rounded-full ring-1 ring-white/40 object-cover shrink-0" />
    );
  }
  const stops = accentFor(role, slot);
  const gradStyle = { background: `linear-gradient(180deg, ${stops.top}, ${stops.bottom})` };

  if (role === "persona") {
    const initials = (name ?? "P").split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();
    if (slot && sessionId) {
      // PersonaAvatar takes a tintClass; we want to pass the same gradient.
      // We render a wrapper with the gradient and let the avatar component handle the image fallback.
      return (
        <div className="w-10 h-10 rounded-full ring-1 ring-white/40 shrink-0 overflow-hidden" style={gradStyle}>
          <PersonaAvatar sessionId={sessionId} slot={slot} initials={initials} tintClass="" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ring-1 ring-white/40 shrink-0" style={gradStyle}>
        {initials}
      </div>
    );
  }
  if (role === "synthesis") {
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ring-1 ring-white/40 shrink-0" style={gradStyle}>
        Σ
      </div>
    );
  }
  if (role === "user") {
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ring-1 ring-white/40 shrink-0" style={gradStyle}>
        {t("role.user", locale)}
      </div>
    );
  }
  return null;
}

function renderInline(line: string, keyPrefix: string) {
  const parts: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) parts.push(line.slice(last, m.index));
    parts.push(<strong key={`${keyPrefix}-b${i++}`} className="font-semibold">{m[1]}</strong>);
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
      return;
    }
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      flushBullets();
      const level = h[1].length;
      const isNumberedSection = level === 2 && /^\s*\d+\.\s/.test(h[2]);
      // Auf hellen Card-Cream Bubbles -- Headings in Ink + Akzent-Trenner
      const cls = level === 1 ? "text-[16px] font-bold text-stone-900 mt-1"
        : level === 2 ? (isNumberedSection
            ? "text-[15px] font-bold text-stone-900 mt-5 pt-4 border-t-2 border-stone-300 uppercase tracking-wide"
            : "text-[15px] font-semibold text-stone-900 mt-3")
        : "text-[14px] font-semibold text-stone-800 mt-2";
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

function fmtTime(d: string | Date, locale: Locale = "de") {
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toLocaleTimeString(locale === "en" ? "en-US" : "de-DE", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

type ReportMeta = { kind?: string; reportId?: string; filename?: string; generatedAt?: string };

export default function MessageBubble({ m, locale = "de" }: { m: Message; locale?: Locale }) {
  const COLLAPSE_AT = 600;
  const isLong = m.role === "persona" && m.content.length > COLLAPSE_AT;
  const [expanded, setExpanded] = useState(false);
  const meta = (typeof m.metadata === "object" && m.metadata !== null ? m.metadata : {}) as ReportMeta;
  const isError = meta.kind === "error" || meta.kind === "report_error";
  const isReport = meta.kind === "report" && !!meta.reportId;
  const isUser = m.role === "user";

  const stops = accentFor(m.role, m.personaSlot);
  const bubbleStyle = { ['--edge-top' as string]: stops.top, ['--edge-bottom' as string]: stops.bottom } as React.CSSProperties;

  let label: string = t(`role.${m.role}`, locale);
  if (m.role === "persona") label = m.personaName || (m.personaSlot ? `${t("role.persona", locale)} ${m.personaSlot}` : t("role.persona", locale));
  if (m.role === "synthesis" && m.roundNumber) label = `${t("role.synthesisRound", locale)} ${m.roundNumber}`;
  if (isError) label = t("role.error", locale);
  void LABELS; // legacy lookup retained for grep-ability

  const labelColor = isError ? "#B91C1C" : stops.bottom;

  return (
    <div className={`flex gap-3 items-start group ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar role={m.role} name={m.personaName} slot={m.personaSlot} sessionId={m.sessionId} locale={locale} />
      <div className={`flex-1 min-w-0 flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div className={`flex items-baseline gap-2 mb-1 ${isUser ? "flex-row-reverse" : ""}`}>
          <span className="font-semibold text-[14px] leading-tight" style={{ color: labelColor }}>{label}</span>
          <span className="text-xs text-stone-500">{fmtTime(m.createdAt, locale)}</span>
        </div>
        {isReport ? (
          <a href={`/api/reports/${m.sessionId}/${meta.reportId}`}
            className="group/card inline-flex items-center gap-3 rounded-2xl px-4 py-3 bg-amber-100 border border-amber-700/40 hover:bg-amber-200 hover:border-amber-700/70 transition-all max-w-[80%] shadow-sm">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"
              style={{ background: `linear-gradient(180deg, ${ROLE_ACCENT.synthesis.top}, ${ROLE_ACCENT.synthesis.bottom})` }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-stone-900 truncate">{t("menu.report", locale)}</div>
              <div className="text-xs text-stone-700 font-medium truncate">{meta.filename || (locale === "en" ? "report.pdf" : "Bericht.pdf")}</div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-stone-700 shrink-0 ml-2 opacity-70 group-hover/card:opacity-100 transition-opacity">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </a>
        ) : (
          <div
            className={`bubble-card ${isUser ? "bubble-card-right" : ""} py-3 text-[14px] leading-relaxed max-w-[85%] [overflow-wrap:anywhere] [word-break:break-word]`}
            style={bubbleStyle}
          >
            {(m.role === "synthesis" || meta.kind === "report_text") ? renderMarkdown(m.content) : (
              <>
                {(expanded || !isLong ? m.content : m.content.slice(0, COLLAPSE_AT).replace(/\s+\S*$/,"") + " …").split(/\n\n+/).map((para, i, arr) => (
                  <p key={i} className={`whitespace-pre-wrap ${i < arr.length - 1 ? "mb-3" : ""}`}>{para}</p>
                ))}
                {isLong && (
                  <button onClick={() => setExpanded(e => !e)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-stone-50 text-stone-900 text-[12px] font-bold shadow-sm ring-1 ring-stone-300 transition-colors">
                    <span>{expanded ? t("chat.weniger", locale) : t("chat.mehr_lesen", locale)}</span>
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

"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { t, type Locale } from "@/lib/i18n";

export default function SessionMenu({ sessionId, afterDelete, locale = "de" }: { sessionId: string; afterDelete?: () => void; locale?: Locale }) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const shareRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menu && !shareUrl) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menu && menuRef.current && !menuRef.current.contains(target)) setMenu(false);
      if (shareUrl && shareRef.current && !shareRef.current.contains(target)) setShareUrl(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMenu(false); setShareUrl(null); }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu, shareUrl]);

  async function del() {
    if (!confirm(t("menu.confirm.delete", locale))) return;
    setBusy(true); setMenu(false);
    const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) { if (afterDelete) afterDelete(); else router.refresh(); }
  }
  function exportPdf() { setMenu(false); window.location.href = `/api/sessions/${sessionId}/export`; }
  async function finalReport() { setMenu(false); setBusy(true); try { await fetch(`/api/sessions/${sessionId}/final-report`, { method: "POST" }); } catch {} setBusy(false); }

  async function share() {
    setBusy(true); setMenu(false);
    const res = await fetch(`/api/sessions/${sessionId}/share`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const d = await res.json();
      setShareUrl(d.url);
      try { await navigator.clipboard.writeText(d.url); } catch {}
    }
  }
  async function unshare() {
    setBusy(true);
    await fetch(`/api/sessions/${sessionId}/share`, { method: "DELETE" });
    setShareUrl(null);
    setBusy(false);
  }

  return (
    <div className="relative">
      <button onClick={() => setMenu(m => !m)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-700 hover:text-stone-900 font-medium hover:bg-amber-100 transition-colors"
        aria-label="Menu">
        <span className="text-lg leading-none">&#8942;</span>
      </button>
      {menu && (
        <div ref={menuRef} className="absolute top-9 right-0 z-50 rounded-xl border border-stone-400/60 bg-stone-50 shadow-2xl min-w-[210px] overflow-hidden text-sm">
          <button onClick={finalReport} className="w-full text-left px-3 py-2 hover:bg-rose-700/10 text-rose-800 font-medium">{t("menu.report", locale)}</button>
          <div className="h-px bg-stone-200"></div>
          <button onClick={exportPdf} className="w-full text-left px-3 py-2 hover:bg-amber-100">{t("menu.chatPdf", locale)}</button>
          <button onClick={share} disabled={busy} className="w-full text-left px-3 py-2 hover:bg-amber-100 disabled:opacity-50">{t("menu.share", locale)}</button>
          <div className="h-px bg-stone-200"></div>
          <button onClick={del} disabled={busy} className="w-full text-left px-3 py-2 hover:bg-red-100 text-red-700 font-medium disabled:opacity-50">{t("menu.delete", locale)}</button>
        </div>
      )}
      {shareUrl && (
        <div ref={shareRef} className="absolute top-9 right-0 z-50 rounded-xl border border-rose-700/40 bg-rose-50 shadow-2xl p-3 text-xs min-w-[300px]">
          <div className="text-rose-800 font-semibold mb-1">{t("menu.share.copied", locale)}</div>
          <div className="text-stone-800 break-all font-medium">{shareUrl}</div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setShareUrl(null)} className="text-stone-700 hover:text-stone-900 font-medium">{t("menu.share.close", locale)}</button>
            <button onClick={unshare} className="text-red-700 hover:text-red-800 font-medium">{t("menu.share.revoke", locale)}</button>
          </div>
        </div>
      )}
    </div>
  );
}

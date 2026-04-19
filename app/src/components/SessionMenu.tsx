"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SessionMenu({ sessionId, afterDelete }: { sessionId: string; afterDelete?: () => void }) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  async function del() {
    if (!confirm("Fokusgruppe und alle Inhalte loeschen?")) return;
    setBusy(true); setMenu(false);
    const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) { if (afterDelete) afterDelete(); else router.refresh(); }
  }
  async function duplicate() {
    setBusy(true); setMenu(false);
    const res = await fetch(`/api/sessions/${sessionId}/duplicate`, { method: "POST" });
    setBusy(false);
    if (res.ok) { const d = await res.json(); router.push(`/app/sessions/${d.session.id}`); }
  }
  function exportPdf() { setMenu(false); window.location.href = `/api/sessions/${sessionId}/export`; }

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
        className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-white/5 transition-colors"
        aria-label="Menu">
        <span className="text-lg leading-none">&#8942;</span>
      </button>
      {menu && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
          <div className="absolute top-9 right-0 z-40 rounded-xl border border-white/10 glass shadow-2xl min-w-[200px] overflow-hidden text-sm">
            <button onClick={duplicate} disabled={busy} className="w-full text-left px-3 py-2 hover:bg-white/5 disabled:opacity-50">Duplizieren</button>
            <button onClick={exportPdf} className="w-full text-left px-3 py-2 hover:bg-white/5">Export als PDF</button>
            <button onClick={share} disabled={busy} className="w-full text-left px-3 py-2 hover:bg-white/5 disabled:opacity-50">Teilen</button>
            <div className="h-px bg-white/10"></div>
            <button onClick={del} disabled={busy} className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-300 disabled:opacity-50">Loeschen</button>
          </div>
        </>
      )}
      {shareUrl && (
        <div className="absolute top-9 right-0 z-40 rounded-xl border border-emerald-500/30 bg-emerald-950/40 glass shadow-2xl p-3 text-xs min-w-[300px]">
          <div className="text-emerald-300 font-medium mb-1">Link kopiert</div>
          <div className="text-neutral-300 break-all">{shareUrl}</div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setShareUrl(null)} className="text-neutral-400 hover:text-neutral-100">Schliessen</button>
            <button onClick={unshare} className="text-red-400 hover:text-red-300">Link widerrufen</button>
          </div>
        </div>
      )}
    </div>
  );
}

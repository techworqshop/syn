"use client";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";

export default function ArchiveActions({ sessionId, locale }: { sessionId: string; locale: Locale }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function restore() {
    setError(null); setLoading(true);
    try {
      const r = await fetch(`/api/sessions/${sessionId}/restore`, { method: "POST" });
      if (!r.ok) throw new Error(await r.text() || `HTTP ${r.status}`);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && <span className="text-xs" style={{ color: "#9F1239" }}>{error}</span>}
      <button disabled={loading} onClick={restore}
        className={`px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap ${loading ? "bg-stone-300 text-stone-500 cursor-not-allowed" : "btn-primary text-white"}`}>
        {loading
          ? (locale === "en" ? "Restoring..." : "Stelle wieder her...")
          : (locale === "en" ? "Restore" : "Wiederherstellen")}
      </button>
    </div>
  );
}

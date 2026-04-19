"use client";
import { useRef, useState } from "react";

export default function SettingsPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(f: File) {
    setUploading(true);
    setStatus(null);
    const fd = new FormData();
    fd.append("file", f);
    const res = await fetch("/api/settings/avatar", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) {
      setStatus("Avatar gespeichert.");
      setRefreshKey(k => k + 1);
    } else {
      setStatus("Upload fehlgeschlagen.");
    }
  }

  async function reset() {
    await fetch("/api/settings/avatar", { method: "DELETE" });
    setStatus("Auf Default zurueckgesetzt.");
    setRefreshKey(k => k + 1);
  }

  return (
    <div className="max-w-3xl mx-auto w-full p-6">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Einstellungen</h1>
      <section className="rounded-2xl border border-white/5 glass p-6">
        <h2 className="font-medium mb-1">Syn Avatar</h2>
        <p className="text-sm text-neutral-500 mb-4">
          Bild als Avatar des Coordinators in den Chat-Bubbles. PNG/JPG/WebP.
        </p>
        <div className="flex items-center gap-5">
          <img key={refreshKey} src={`/api/assets/syn-avatar?v=${refreshKey}`}
            alt="Syn avatar preview"
            className="w-24 h-24 rounded-full ring-2 ring-fuchsia-500/30 object-cover bg-neutral-900" />
          <div className="flex flex-col gap-2">
            <input ref={inputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { if (e.target.files?.[0]) upload(e.target.files[0]); e.target.value=""; }} />
            <button onClick={() => inputRef.current?.click()} disabled={uploading}
              className="btn-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {uploading ? "Laedt..." : "Bild hochladen"}
            </button>
            <button onClick={reset}
              className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-sm text-neutral-300">
              Zuruecksetzen
            </button>
          </div>
        </div>
        {status && <p className="text-xs text-neutral-400 mt-4">{status}</p>}
      </section>
    </div>
  );
}

"use client";
import { useCallback, useRef, useState } from "react";
import type { FileRow } from "./types";

type Pending = {
  id: string;
  file: File;
  category: "briefing" | "persona" | "panel";
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

type Props = {
  sessionId: string;
  onClose: () => void;
  onUploaded: (f: FileRow) => void;
};

const CAT_LABELS: Record<string, string> = {
  briefing: "Briefing",
  persona: "Persona-Daten",
  panel: "Panel-Review"
};

export default function UploadModal({ sessionId, onClose, onUploaded }: Props) {
  const [pendings, setPendings] = useState<Pending[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((list: FileList | File[]) => {
    const arr = Array.from(list);
    setPendings(prev => [...prev, ...arr.map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      category: "panel" as const,
      progress: 0,
      status: "pending" as const
    }))]);
  }, []);

  function remove(id: string) {
    setPendings(prev => prev.filter(p => p.id !== id));
  }
  function setCategory(id: string, cat: Pending["category"]) {
    setPendings(prev => prev.map(p => p.id === id ? { ...p, category: cat } : p));
  }

  function uploadOne(p: Pending): Promise<FileRow | null> {
    return new Promise((resolve) => {
      const fd = new FormData();
      fd.append("file", p.file);
      fd.append("category", p.category);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/sessions/${sessionId}/upload`);
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round((e.loaded / e.total) * 100);
        setPendings(prev => prev.map(x => x.id === p.id ? { ...x, progress: pct, status: "uploading" } : x));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const d = JSON.parse(xhr.responseText);
            setPendings(prev => prev.map(x => x.id === p.id ? { ...x, progress: 100, status: "done" } : x));
            resolve(d.file ?? null);
          } catch { resolve(null); }
        } else {
          setPendings(prev => prev.map(x => x.id === p.id ? { ...x, status: "error", error: "HTTP " + xhr.status } : x));
          resolve(null);
        }
      };
      xhr.onerror = () => {
        setPendings(prev => prev.map(x => x.id === p.id ? { ...x, status: "error", error: "Netzwerkfehler" } : x));
        resolve(null);
      };
      xhr.send(fd);
    });
  }

  async function submitAll() {
    if (busy) return;
    setBusy(true);
    const toUpload = pendings.filter(p => p.status === "pending");
    await Promise.all(toUpload.map(async p => {
      const f = await uploadOne(p);
      if (f) onUploaded(f);
    }));
    setBusy(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }
  const pendingCount = pendings.filter(p => p.status === "pending").length;
  const allDone = pendings.length > 0 && pendings.every(p => p.status === "done");

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] glass border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div>
            <div className="font-semibold tracking-tight">Dateien hochladen</div>
            <div className="text-xs text-neutral-500 mt-0.5">Drag + Drop oder Klick zum Auswaehlen. Mehrere Dateien moeglich.</div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-100 text-sm">Schliessen</button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-sky-500 bg-sky-500/5" : "border-white/10 hover:border-white/20 bg-white/[0.02]"}`}>
            <div className="text-neutral-300 font-medium">Dateien hierher ziehen</div>
            <div className="text-sm text-neutral-500 mt-1">oder klicken zum Auswaehlen</div>
            <input ref={inputRef} type="file" multiple className="hidden"
              onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value=""; }} />
          </div>

          {pendings.length > 0 && (
            <ul className="space-y-2">
              {pendings.map(p => (
                <li key={p.id} className="rounded-xl border border-white/5 bg-neutral-900/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.file.name}</div>
                      <div className="text-xs text-neutral-500">{Math.round(p.file.size/1024)} KB</div>
                    </div>
                    <select value={p.category}
                      disabled={p.status === "uploading" || p.status === "done"}
                      onChange={e => setCategory(p.id, e.target.value as Pending["category"])}
                      className="text-xs bg-neutral-900 border border-white/10 rounded-lg px-2 py-1.5 focus:outline-none focus:border-sky-500/60">
                      <option value="briefing">Briefing</option>
                      <option value="persona">Persona-Daten</option>
                      <option value="panel">Panel-Review</option>
                    </select>
                    {p.status !== "done" && p.status !== "uploading" && (
                      <button onClick={() => remove(p.id)}
                        className="text-neutral-500 hover:text-red-400 text-xs px-2 py-1">
                        X
                      </button>
                    )}
                  </div>
                  {p.status !== "pending" && (
                    <div className="mt-2">
                      <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                        <div className={`h-full transition-all ${p.status === "error" ? "bg-red-500" : p.status === "done" ? "bg-emerald-500" : "bg-sky-500"}`} style={{ width: `${p.progress}%` }} />
                      </div>
                      <div className="text-xs text-neutral-500 mt-1">
                        {p.status === "uploading" && `${p.progress}%`}
                        {p.status === "done" && "Hochgeladen - wird analysiert..."}
                        {p.status === "error" && `Fehler: ${p.error}`}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-white/5 px-5 py-3 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            {pendings.length === 0 ? "Keine Dateien ausgewaehlt" : pendings.length + " Dateien"}
          </div>
          <div className="flex gap-2">
            {allDone ? (
              <button onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-medium">
                Fertig
              </button>
            ) : (
              <button onClick={submitAll} disabled={pendingCount === 0 || busy}
                className="px-4 py-2 rounded-lg btn-primary text-sm font-medium disabled:opacity-50">
                {busy ? "Laedt..." : pendingCount + " hochladen"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

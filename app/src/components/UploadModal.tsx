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
  locale?: "de" | "en";
  existingCount?: number;
};

const MAX_FILES = 5;

const CAT_LABELS: Record<string, string> = {
  briefing: "Briefing",
  persona: "Persona-Daten",
  panel: "Panel-Review"
};

export default function UploadModal({ sessionId, onClose, onUploaded, locale = "de", existingCount = 0 }: Props) {
  const [pendings, setPendings] = useState<Pending[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((list: FileList | File[]) => {
    const arr = Array.from(list);
    setPendings(prev => {
      const slotsLeft = Math.max(0, MAX_FILES - existingCount - prev.length);
      const accepted = arr.slice(0, slotsLeft);
      return [...prev, ...accepted.map(f => ({
        id: Math.random().toString(36).slice(2),
        file: f,
        category: "panel" as const,
        progress: 0,
        status: "pending" as const
      }))];
    });
  }, [existingCount]);

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
          let errMsg = "HTTP " + xhr.status;
          try {
            const d = JSON.parse(xhr.responseText);
            if (d?.error) errMsg = d.error;
          } catch {}
          setPendings(prev => prev.map(x => x.id === p.id ? { ...x, status: "error", error: errMsg } : x));
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
      <div className="w-full max-w-2xl max-h-[85vh] bg-stone-50 border border-stone-400/40 rounded-md flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-stone-300 px-5 py-4 bg-stone-100/70">
          <div>
            <div className="font-semibold tracking-tight">Dateien hochladen</div>
            <div className="text-xs text-stone-700 mt-0.5 font-medium">Drag + Drop oder Klick zum Auswaehlen. Maximal {MAX_FILES} Dateien pro Session ({existingCount + pendings.length}/{MAX_FILES} belegt).</div>
          </div>
          <button onClick={onClose} className="text-stone-700 hover:text-stone-900 font-medium text-sm">Schliessen</button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {(existingCount + pendings.length) >= MAX_FILES ? (
            <div className="rounded-md border-2 border-dashed border-stone-300 bg-stone-100/60 p-8 text-center text-stone-600">
              <div className="font-semibold">Limit erreicht</div>
              <div className="text-sm mt-1">{MAX_FILES} Dateien pro Session — loesche eine bestehende, um eine neue hochzuladen.</div>
            </div>
          ) : (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`rounded-md border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-rose-700 bg-rose-100/60" : "border-stone-400 hover:border-rose-700/50 bg-white/60"}`}>
              <div className="text-stone-900 font-semibold">Dateien hierher ziehen</div>
              <div className="text-sm text-stone-700 mt-1">oder klicken zum Auswaehlen ({MAX_FILES - existingCount - pendings.length} frei)</div>
              <input ref={inputRef} type="file" multiple className="hidden"
                onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value=""; }} />
            </div>
          )}

          {pendings.length > 0 && (
            <ul className="space-y-2">
              {pendings.map(p => (
                <li key={p.id} className="rounded-md border border-stone-300 bg-white/70 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-stone-900 truncate">{p.file.name}</div>
                      <div className="text-xs text-stone-700 font-medium">{Math.round(p.file.size/1024)} KB</div>
                    </div>
                    <select value={p.category}
                      disabled={p.status === "uploading" || p.status === "done"}
                      onChange={e => setCategory(p.id, e.target.value as Pending["category"])}
                      className="text-xs bg-white border border-stone-400 text-stone-900 rounded-md px-2 py-1.5 focus:outline-none focus:border-rose-700/60">
                      <option value="briefing">Briefing</option>
                      <option value="persona">Persona-Daten</option>
                      <option value="panel">Panel-Review</option>
                    </select>
                    {p.status !== "done" && p.status !== "uploading" && (
                      <button onClick={() => remove(p.id)}
                        className="text-stone-500 hover:text-red-400 text-xs px-2 py-1">
                        X
                      </button>
                    )}
                  </div>
                  {p.status !== "pending" && (
                    <div className="mt-2">
                      <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
                        <div className={`h-full transition-all ${p.status === "error" ? "bg-red-500" : p.status === "done" ? "bg-emerald-600" : "bg-rose-500"}`} style={{ width: `${p.progress}%` }} />
                      </div>
                      <div className="text-xs text-stone-700 font-medium mt-1">
                        {p.status === "uploading" && `${p.progress}%`}
                        {p.status === "done" && (locale === "en" ? "Uploaded - analysis starts with first chat" : "Hochgeladen - Analyse startet mit dem ersten Chat")}
                        {p.status === "error" && `Fehler: ${p.error}`}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-stone-300 px-5 py-3 flex items-center justify-between bg-stone-100/70">
          <div className="text-xs text-stone-700 font-medium">
            {pendings.length === 0 ? "Keine Dateien ausgewaehlt" : pendings.length + " Dateien"}
          </div>
          <div className="flex gap-2">
            {allDone ? (
              <button onClick={onClose}
                className="px-4 py-2 rounded-md bg-gradient-to-r from-purple-800 to-rose-700 text-white text-sm font-medium">
                Fertig
              </button>
            ) : (
              <button onClick={submitAll} disabled={pendingCount === 0 || busy}
                className="px-4 py-2 rounded-md btn-primary text-sm font-medium disabled:opacity-50">
                {busy ? "Laedt..." : pendingCount + " hochladen"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

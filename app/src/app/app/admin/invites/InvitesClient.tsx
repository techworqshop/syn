"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props =
  | { inviteId?: undefined; token?: undefined; mode?: undefined; subtle?: undefined }
  | { inviteId: string; token?: string; mode: "revoke"; subtle?: boolean };

export default function InvitesClient(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ text: string; url?: string } | null>(null);

  if ((props as { mode?: string }).mode === "revoke") {
    const p = props as { inviteId: string; subtle?: boolean };
    async function revoke() {
      if (!confirm("Einladung widerrufen?")) return;
      setBusy(true);
      await fetch(`/api/invites/${p.inviteId}`, { method: "DELETE" });
      setBusy(false);
      router.refresh();
    }
    return (
      <button onClick={revoke} disabled={busy}
        className={`text-xs px-2 py-1 rounded transition-colors disabled:opacity-50 ${
          p.subtle
            ? "text-stone-500 hover:text-red-700 hover:bg-red-50"
            : "text-red-700 hover:text-red-900 font-medium hover:bg-red-100"
        }`}>
        {busy ? "..." : "Widerrufen"}
      </button>
    );
  }

  // Create form
  async function create() {
    if (!email.trim() || busy) return;
    setBusy(true);
    const r = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() })
    });
    setBusy(false);
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      setMsg({ text: d.mailed ? "Einladung per Mail verschickt." : "Invite-Link generiert.", url: d.inviteUrl });
      try { if (d.inviteUrl) await navigator.clipboard.writeText(d.inviteUrl); } catch {}
      setEmail("");
      router.refresh();
    } else {
      setMsg({ text: d.error || "Fehler" });
    }
  }

  return (
    <div className="rounded-2xl border border-stone-300 bg-[#F3EFE2] p-4 shadow-sm">
      <label className="text-xs uppercase tracking-wide text-stone-600 font-bold">Email einladen</label>
      <div className="flex gap-2 mt-2">
        <input value={email} onChange={e => setEmail(e.target.value)}
          placeholder="kollege@firma.com" type="email"
          onKeyDown={e => { if (e.key === "Enter") create(); }}
          className="flex-1 px-4 py-2 rounded-xl bg-white border border-stone-300 focus:outline-none focus:border-rose-700/50 text-sm" />
        <button onClick={create} disabled={busy || !email.trim()}
          className="btn-primary px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50">
          {busy ? "..." : "Einladen"}
        </button>
      </div>
      {msg && (
        <div className="mt-3 p-2.5 rounded-lg bg-white border border-stone-200 text-sm">
          <div className="text-stone-800">{msg.text}</div>
          {msg.url && <div className="mt-1 text-xs text-rose-700 break-all">{msg.url}</div>}
        </div>
      )}
    </div>
  );
}

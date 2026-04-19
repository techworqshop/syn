"use client";
import { useEffect, useState } from "react";

type Invite = {
  id: string;
  email: string;
  token: string;
  usedAt: string | null;
  expiresAt: string;
  createdAt: string;
};

export default function UsersPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; url?: string } | null>(null);

  async function load() {
    const r = await fetch("/api/invites");
    if (r.ok) { const d = await r.json(); setInvites(d.invites || []); }
  }
  useEffect(() => { load(); }, []);

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
      const text = d.mailed ? "Einladung per Mail verschickt." : "Invite-Link generiert (Mail nicht verschickt).";
      setMsg({ text, url: d.inviteUrl });
      try { if (d.inviteUrl) await navigator.clipboard.writeText(d.inviteUrl); } catch {}
      setEmail("");
      load();
    } else {
      setMsg({ text: d.error || "Fehler" });
    }
  }

  async function revoke(id: string) {
    if (!confirm("Einladung widerrufen?")) return;
    await fetch(`/api/invites/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="max-w-3xl mx-auto w-full p-6">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Nutzer</h1>
      <p className="text-sm text-neutral-500 mb-6">Lad Kollegen zu SynWeb ein.</p>
      <div className="rounded-2xl border border-white/5 glass p-5 mb-6">
        <label className="text-xs uppercase tracking-wide text-neutral-500">Email-Adresse einladen</label>
        <div className="flex gap-2 mt-2">
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="kollege@firma.com" type="email"
            onKeyDown={e => { if (e.key === "Enter") create(); }}
            className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-900/70 border border-white/10 focus:outline-none focus:border-fuchsia-500/50" />
          <button onClick={create} disabled={busy || !email.trim()}
            className="btn-primary px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
            {busy ? "..." : "Einladen"}
          </button>
        </div>
        {msg && (
          <div className="mt-3 p-3 rounded-lg bg-neutral-900/70 border border-white/5 text-sm">
            <div className="text-neutral-200">{msg.text}</div>
            {msg.url && (
              <div className="mt-1 text-xs text-fuchsia-300 break-all">{msg.url}</div>
            )}
          </div>
        )}
      </div>

      <h2 className="text-sm font-medium text-neutral-400 mb-3">Offene Einladungen</h2>
      {invites.length === 0 ? (
        <div className="rounded-xl border border-white/5 glass p-8 text-center text-sm text-neutral-500">
          Noch keine Einladungen verschickt.
        </div>
      ) : (
        <ul className="space-y-2">
          {invites.map(i => {
            const used = !!i.usedAt;
            const expired = new Date(i.expiresAt) < new Date();
            return (
              <li key={i.id} className="rounded-xl border border-white/5 bg-neutral-900/40 p-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{i.email}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {used ? "Account erstellt" : expired ? "Abgelaufen" : "Gueltig"}
                  </div>
                </div>
                {!used && (
                  <button onClick={() => revoke(i.id)} className="text-xs text-red-400 hover:text-red-300 px-3 py-1">Widerrufen</button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

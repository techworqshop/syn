"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invites/by-token/${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.email) { setEmail(d.email); setReady(true); } else setReady(false); })
      .catch(() => setReady(false));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("Passwort mindestens 8 Zeichen."); return; }
    if (password !== confirm) { setError("Passwoerter stimmen nicht ueberein."); return; }
    setBusy(true);
    const r = await fetch(`/api/invites/by-token/${token}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password })
    });
    setBusy(false);
    const d = await r.json().catch(() => ({}));
    if (r.ok) router.push("/login?registered=1");
    else setError(d.error || "Fehler");
  }

  if (ready === null) {
    return <div className="min-h-screen flex items-center justify-center text-stone-600">Pruefe Einladung...</div>;
  }
  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Einladung ungueltig</h1>
          <p className="text-stone-500">Diese Einladung ist abgelaufen oder wurde bereits verwendet.</p>
        </div>
      </main>
    );
  }

  const inp = "w-full px-4 py-2.5 rounded-xl bg-white/80 border border-stone-300 focus:outline-none focus:border-rose-700/50";
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 p-8 rounded-2xl border border-stone-200 glass shadow-2xl">
        <div className="flex items-center justify-center mb-4">
          <img src="/api/assets/syn-avatar" alt="" className="w-14 h-14 rounded-full ring-2 ring-rose-700/30" />
        </div>
        <div className="text-center mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">Willkommen bei Syn</h1>
          <p className="text-sm text-stone-500 mt-1">Du richtest deinen Account fuer <b className="text-stone-700">{email}</b> ein.</p>
        </div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Dein Name (optional)" className={inp} />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Passwort (min. 8)" required className={inp} />
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Passwort bestaetigen" required className={inp} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={busy} className="w-full btn-primary py-2.5 rounded-xl font-medium disabled:opacity-50">
          {busy ? "..." : "Account erstellen"}
        </button>
      </form>
    </main>
  );
}

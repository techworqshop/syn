"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminToggle({ userId, initialIsAdmin, isSelf, email }: {
  userId: string; initialIsAdmin: boolean; isSelf: boolean; email: string;
}) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function toggle() {
    if (busy) return;
    const next = !isAdmin;
    if (isSelf && !next) {
      setErr("Du kannst dir selber den Admin-Status nicht entziehen.");
      return;
    }
    if (!confirm(next ? `${email} ZUM Admin machen?` : `Admin-Status von ${email} entziehen?`)) return;
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/users/${userId}/admin`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAdmin: next })
    });
    setBusy(false);
    if (res.ok) {
      setIsAdmin(next);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setErr(d.error || `Fehler ${res.status}`);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button onClick={toggle} disabled={busy || (isSelf && isAdmin)}
        title={isSelf && isAdmin ? "Du kannst dir nicht selbst den Admin-Status entziehen" : (isAdmin ? "Admin-Status entziehen" : "Zum Admin machen")}
        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isAdmin
            ? "bg-rose-100 text-rose-900 hover:bg-rose-200 border border-rose-700/40"
            : "bg-stone-100 text-stone-800 hover:bg-stone-200 border border-stone-300"
        }`}>
        {busy ? "..." : (isAdmin ? "Admin · klick zum Entziehen" : "→ Zum Admin machen")}
      </button>
      {err && <div className="text-xs text-red-700">{err}</div>}
    </div>
  );
}

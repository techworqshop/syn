"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UsersClient({ userId, email, isSelf }: { userId: string; email: string; isSelf: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (isSelf) return null;
  async function kick() {
    if (!confirm(`${email} loeschen? Alle Sessions dieses Users gehen damit auch verloren.`)) return;
    setBusy(true);
    await fetch(`/api/users/${userId}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }
  return (
    <button onClick={kick} disabled={busy}
      className="text-xs text-red-700 hover:text-red-900 font-medium px-2 py-1 rounded hover:bg-red-100 transition-colors disabled:opacity-50">
      {busy ? "..." : "Kicken"}
    </button>
  );
}

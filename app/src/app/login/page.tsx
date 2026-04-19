"use client";
import { useActionState } from "react";
import { loginAction } from "./actions";

const inp = "w-full px-4 py-2.5 rounded-xl bg-neutral-900/70 border border-white/10 focus:outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/10 transition-all placeholder:text-neutral-500";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, { error: null });
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form action={action} className="w-full max-w-sm space-y-4 p-8 rounded-2xl border border-white/5 glass shadow-2xl shadow-black/50">
        <div className="flex items-center justify-center mb-4">
          <img src="/syn-avatar.svg" alt="" className="w-14 h-14 rounded-full ring-2 ring-sky-500/20" />
        </div>
        <div className="text-center space-y-1 mb-2">
          <h1 className="text-2xl font-semibold tracking-tight">SynWeb</h1>
          <p className="text-sm text-neutral-500">Melde dich mit deinem Account an.</p>
        </div>
        <input name="email" type="email" required placeholder="Email" className={inp} />
        <input name="password" type="password" required placeholder="Passwort" className={inp} />
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        <button disabled={pending} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 disabled:opacity-50 font-medium transition-all shadow-lg shadow-sky-900/30">
          {pending ? "..." : "Einloggen"}
        </button>
      </form>
    </main>
  );
}

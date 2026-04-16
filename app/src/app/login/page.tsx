"use client";
import { useActionState } from "react";
import { loginAction } from "./actions";

const inp = "w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-sky-500";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, { error: null });
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form action={action} className="w-full max-w-sm space-y-4 p-8 rounded-lg border border-neutral-800 bg-neutral-900/50">
        <h1 className="text-2xl font-semibold">SynWeb Login</h1>
        <input name="email" type="email" required placeholder="Email" className={inp} />
        <input name="password" type="password" required placeholder="Passwort" className={inp} />
        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        <button disabled={pending} className="w-full py-2 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50">
          {pending ? "..." : "Einloggen"}
        </button>
      </form>
    </main>
  );
}

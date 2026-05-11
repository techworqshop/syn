import { signOut } from "@/lib/auth";
import { requireUser } from "@/lib/current-user";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser().catch(() => null);
  if (!u) redirect("/login");
  return (
    <div className="h-screen flex flex-col">
      <header className="glass border-b border-stone-200 px-6 py-1.5 flex items-center justify-between sticky top-0 z-20">
        <Link href="/app/dashboard" className="flex items-center gap-2 group">
          <img src="/api/assets/syn-avatar" alt="" className="w-6 h-6 rounded-full ring-1 ring-white/10" />
          <div className="font-semibold tracking-tight text-red-700 group-hover:text-red-800">Syn</div>
        </Link>
        <div className="text-sm text-stone-800 flex items-center gap-4">
          <Link href="/app/help" title="So funktioniert Syn"
            className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-stone-400 text-stone-700 hover:text-emerald-700 hover:border-emerald-700 transition-colors font-bold">?</Link>
          <span className="hidden sm:inline text-stone-700">{u.email}</span>
          {u.isAdmin && <Link href="/app/users" className="hidden sm:inline text-stone-700 hover:text-emerald-700 transition-colors">User</Link>}
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button className="text-stone-700 hover:text-emerald-700 transition-colors">Logout</button>
          </form>
        </div>
      </header>
      <main className="flex-1 flex flex-col min-h-0">{children}</main>
    </div>
  );
}

import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass border-b border-white/5 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <Link href="/app/dashboard" className="flex items-center gap-2.5 group">
          <img src="/syn-avatar.svg" alt="" className="w-7 h-7 rounded-full ring-1 ring-white/10" />
          <div className="font-semibold tracking-tight text-neutral-100 group-hover:text-white">SynWeb</div>
        </Link>
        <div className="text-sm text-neutral-400 flex items-center gap-4">
          <span className="hidden sm:inline text-neutral-500">{session.user.email}</span>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button className="text-neutral-400 hover:text-neutral-100 transition-colors">Logout</button>
          </form>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

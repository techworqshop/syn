import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sessions } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function createSession() {
  "use server";
  const u = await requireUser();
  const [row] = await db.insert(sessions).values({ userId: u.id }).returning();
  redirect(`/app/sessions/${row.id}`);
}

export default async function Dashboard() {
  const u = await requireUser();
  const rows = await db.select().from(sessions)
    .where(eq(sessions.userId, u.id))
    .orderBy(desc(sessions.updatedAt));
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Fokusgruppen</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Deine synthetischen Panels. Klick auf eine Session um fortzusetzen.
          </p>
        </div>
        <form action={createSession}>
          <button className="px-5 py-2.5 rounded-xl btn-primary font-medium shadow-lg shadow-sky-900/30 text-sm">
            Neue Fokusgruppe
          </button>
        </form>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/5 glass p-12 text-center">
          <img src="/syn-avatar.svg" alt="" className="w-14 h-14 mx-auto opacity-50 mb-4" />
          <div className="text-neutral-300 mb-1">Noch keine Fokusgruppe.</div>
          <div className="text-sm text-neutral-500">Klick oben auf Neue Fokusgruppe um zu starten.</div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map(s => (
            <li key={s.id}>
              <Link href={`/app/sessions/${s.id}`}
                className="block p-5 rounded-2xl border border-white/5 bg-neutral-900/40 hover:bg-neutral-900/70 hover:border-sky-500/30 transition-all group">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate group-hover:text-white">{s.title}</div>
                    <div className="text-xs text-neutral-500 mt-1.5 flex flex-wrap gap-x-3">
                      <span>{s.status}</span>
                      <span>Runde {s.currentRound}</span>
                      <span>{s.personaCount} Personas</span>
                    </div>
                  </div>
                  <div className="text-xs text-neutral-600 shrink-0">
                    {new Date(s.updatedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

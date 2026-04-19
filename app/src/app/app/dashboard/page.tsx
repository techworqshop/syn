import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sessions } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { eq, desc } from "drizzle-orm";
import SessionCard from "@/components/SessionCard";

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
    <div className="max-w-5xl mx-auto w-full p-6">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Fokusgruppen</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Deine synthetischen Panels. Klick auf eine Session um fortzusetzen.
          </p>
        </div>
        <form action={createSession}>
          <button className="btn-primary px-5 py-2.5 rounded-xl font-medium text-sm">
            Neue Fokusgruppe
          </button>
        </form>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/5 glass p-12 text-center">
          <img src="/api/assets/syn-avatar" alt="" className="w-14 h-14 mx-auto mb-4 rounded-full" />
          <div className="text-neutral-300 mb-1">Noch keine Fokusgruppe.</div>
          <div className="text-sm text-neutral-500">Klick oben auf Neue Fokusgruppe um zu starten.</div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map(s => <SessionCard key={s.id} s={s} />)}
        </div>
      )}
    </div>
  );
}

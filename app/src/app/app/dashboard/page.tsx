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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold">Deine Fokusgruppen</h1>
        <form action={createSession}>
          <button className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 font-medium">
            + Neue Fokusgruppe
          </button>
        </form>
      </div>
      {rows.length === 0 ? (
        <div className="rounded border border-neutral-800 bg-neutral-900/50 p-12 text-center text-neutral-400">
          Noch keine Fokusgruppe. Klick oben auf Neue Fokusgruppe um zu starten.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map(s => (
            <li key={s.id}>
              <Link href={`/app/sessions/${s.id}`}
                className="block p-4 rounded border border-neutral-800 hover:border-sky-600 bg-neutral-900/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {s.status} - Runde {s.currentRound} - {s.personaCount} Personas
                    </div>
                  </div>
                  <div className="text-xs text-neutral-500">
                    {new Date(s.updatedAt).toLocaleDateString("de-DE")}
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

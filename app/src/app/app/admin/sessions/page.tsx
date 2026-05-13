import Link from "next/link";
import { db } from "@/lib/db";
import { sessions, users } from "@/db/schema";
import { requireAdmin } from "@/lib/current-user";
import { desc, eq, sql } from "drizzle-orm";
import AdminError from "@/components/admin/AdminError";

import AdminFilterBar from "@/components/admin/AdminFilterBar";

export const dynamic = "force-dynamic";

export default async function AdminSessionsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; sort?: string; q?: string }>
}) {
  await requireAdmin();
  try {
  const params = await searchParams;
  const status = params.status || "all"; // all | open | closed
  const q = (params.q ?? "").trim().toLowerCase();

  const rows = await db
    .select({
      id: sessions.id,
      title: sessions.title,
      currentRound: sessions.currentRound,
      personaCount: sessions.personaCount,
      createdAt: sessions.createdAt,
      updatedAt: sessions.updatedAt,
      userId: sessions.userId,
      userEmail: users.email,
      userName: users.name,
      msgCount: sql<number>`(SELECT count(*) FROM messages m WHERE m.session_id = ${sessions.id})::int`,
      fileCount: sql<number>`(SELECT count(*) FROM files f WHERE f.session_id = ${sessions.id})::int`
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .orderBy(desc(sessions.updatedAt));

  const byStatus = status === "open"
    ? rows.filter(r => r.currentRound < 3)
    : status === "closed"
      ? rows.filter(r => r.currentRound >= 3)
      : rows;
  const filtered = q
    ? byStatus.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q) ||
        (r.userName ?? "").toLowerCase().includes(q)
      )
    : byStatus;

  return (
    <div className="max-w-6xl mx-auto w-full p-6">
      <div className="mb-4 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Sessions</h1>
          <p className="text-sm text-stone-600 mt-1">
            {filtered.length === rows.length
              ? <>{rows.length} Sessions</>
              : <>{filtered.length} von {rows.length} Sessions gefiltert</>}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-stone-200 p-1">
          {[
            { v: "all", label: "Alle" },
            { v: "open", label: "Offen" },
            { v: "closed", label: "Abgeschlossen" }
          ].map(opt => {
            const url = q
              ? `/app/admin/sessions?status=${opt.v}&q=${encodeURIComponent(q)}`
              : `/app/admin/sessions?status=${opt.v}`;
            return (
              <Link key={opt.v} href={url}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  status === opt.v ? "bg-white text-stone-900 shadow-sm" : "text-stone-700 hover:bg-white/60"
                }`}>
                {opt.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mb-4">
        <AdminFilterBar placeholder="Filter nach Session-Titel, User-Email oder Name..." />
      </div>

      <div className="rounded-2xl border border-stone-300 bg-[#F3EFE2] overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-[11px] uppercase tracking-wide text-stone-600 font-bold border-b border-stone-300 bg-stone-100/60">
          <div className="col-span-4">Session</div>
          <div className="col-span-2">Owner</div>
          <div className="col-span-1 text-right">Runde</div>
          <div className="col-span-1 text-right">Personas</div>
          <div className="col-span-1 text-right">Msgs</div>
          <div className="col-span-1 text-right">Files</div>
          <div className="col-span-2 text-right">Aktualisiert</div>
        </div>
        <ul className="divide-y divide-stone-200">
          {filtered.map(r => {
            const closed = r.currentRound >= 3;
            return (
              <li key={r.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-white/40 transition-colors">
                <div className="col-span-4 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/app/admin/sessions/${r.id}`} className="font-medium text-stone-900 truncate hover:text-rose-800 transition-colors">{r.title}</Link>
                    {closed && (
                      <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full font-bold text-white shrink-0"
                        style={{ background: "linear-gradient(180deg, #4C1D95, #BE123C)" }}>Done</span>
                    )}
                  </div>
                </div>
                <div className="col-span-2 min-w-0">
                  <Link href={`/app/admin/users/${r.userId}`} className="text-sm text-stone-700 hover:text-rose-800 truncate block transition-colors">
                    {r.userName || r.userEmail}
                  </Link>
                </div>
                <div className="col-span-1 text-right text-sm text-stone-900 font-semibold">{r.currentRound}</div>
                <div className="col-span-1 text-right text-sm text-stone-700">{r.personaCount}</div>
                <div className="col-span-1 text-right text-sm text-stone-700">{r.msgCount}</div>
                <div className="col-span-1 text-right text-sm text-stone-700">{r.fileCount}</div>
                <div className="col-span-2 text-right text-xs text-stone-600">
                  {timeAgo(new Date(r.updatedAt))}
                </div>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="p-6 text-sm text-stone-600 text-center">Keine Sessions im aktuellen Filter.</li>
          )}
        </ul>
      </div>
    </div>
  );
  } catch (e) {
    console.error("[admin/sessions] failed", e);
    return <AdminError where="Sessions" error={e} />;
  }
}

function timeAgo(d: Date): string {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `vor ${m} Min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std`;
  const days = Math.floor(h / 24);
  if (days < 7) return `vor ${days} Tagen`;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "2-digit" });
}

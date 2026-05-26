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
  const sort = params.sort || "updated:desc";

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
  const beforeSort = q
    ? byStatus.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q) ||
        (r.userName ?? "").toLowerCase().includes(q)
      )
    : byStatus;

  const [sortCol, sortDir] = sort.split(":");
  const dir = sortDir === "asc" ? 1 : -1;
  const filtered = [...beforeSort].sort((a, b) => {
    const cmp = (() => {
      switch (sortCol) {
        case "title":   return a.title.localeCompare(b.title);
        case "owner":   return (a.userName || a.userEmail).localeCompare(b.userName || b.userEmail);
        case "round":   return a.currentRound - b.currentRound;
        case "personas":return a.personaCount - b.personaCount;
        case "msgs":    return a.msgCount - b.msgCount;
        case "files":   return a.fileCount - b.fileCount;
        case "created": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "updated": default: return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
    })();
    return cmp * dir;
  });

  function sortUrl(col: string): string {
    const nextDir = sortCol === col && sortDir === "desc" ? "asc" : sortCol === col && sortDir === "asc" ? "desc" : (col === "title" || col === "owner" ? "asc" : "desc");
    const sp = new URLSearchParams();
    if (status !== "all") sp.set("status", status);
    if (q) sp.set("q", q);
    sp.set("sort", `${col}:${nextDir}`);
    return `/app/admin/sessions?${sp.toString()}`;
  }
  function sortIndicator(col: string): string {
    if (sortCol !== col) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

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
        <div className="flex gap-1 rounded-md bg-stone-200 p-1">
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

      <div className="mb-4 flex items-stretch gap-2">
        <div className="flex-1">
          <AdminFilterBar placeholder="Filter nach Session-Titel, User-Email oder Name..." />
        </div>
        <a href={`/api/admin/export/sessions?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ""}&sort=${sort}`}
          className="rounded-md bg-[#F3EFE2] border border-stone-300 px-3 shadow-sm text-xs font-bold text-stone-700 hover:text-rose-700 hover:border-rose-700 transition-colors flex items-center gap-1.5"
          title="Sichtbare Zeilen als CSV exportieren">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          CSV
        </a>
      </div>

      <div className="rounded-md border border-stone-300 bg-[#F3EFE2] overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-[11px] uppercase tracking-wide text-stone-600 font-bold border-b border-stone-300 bg-stone-100/60">
          <Link href={sortUrl("title")} className="col-span-4 hover:text-stone-900 transition-colors">Session{sortIndicator("title")}</Link>
          <Link href={sortUrl("owner")} className="col-span-2 hover:text-stone-900 transition-colors">Owner{sortIndicator("owner")}</Link>
          <Link href={sortUrl("round")} className="col-span-1 text-right hover:text-stone-900 transition-colors">Runde{sortIndicator("round")}</Link>
          <Link href={sortUrl("personas")} className="col-span-1 text-right hover:text-stone-900 transition-colors">Personas{sortIndicator("personas")}</Link>
          <Link href={sortUrl("msgs")} className="col-span-1 text-right hover:text-stone-900 transition-colors">Msgs{sortIndicator("msgs")}</Link>
          <Link href={sortUrl("files")} className="col-span-1 text-right hover:text-stone-900 transition-colors">Files{sortIndicator("files")}</Link>
          <Link href={sortUrl("updated")} className="col-span-2 text-right hover:text-stone-900 transition-colors">Aktualisiert{sortIndicator("updated")}</Link>
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

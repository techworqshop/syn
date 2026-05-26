import Link from "next/link";
import { db } from "@/lib/db";
import { users, sessions, files, messages } from "@/db/schema";
import { requireAdmin } from "@/lib/current-user";
import { desc, eq, sql, inArray } from "drizzle-orm";
import UsersClient from "./UsersClient";
import AdminError from "@/components/admin/AdminError";

import AdminFilterBar from "@/components/admin/AdminFilterBar";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams
}: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();
  const sort = sp.sort || "created:desc";
  const [sortCol, sortDir] = sort.split(":");
  const dir = sortDir === "asc" ? 1 : -1;

  function sortUrl(col: string): string {
    const nextDir = sortCol === col && sortDir === "desc" ? "asc" : sortCol === col && sortDir === "asc" ? "desc" : (col === "account" ? "asc" : "desc");
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    u.set("sort", `${col}:${nextDir}`);
    return `/app/admin/users?${u.toString()}`;
  }
  function sortInd(col: string): string {
    if (sortCol !== col) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  try {
  // Alle User
  const allUsers = await db.select({
    id: users.id, email: users.email, name: users.name,
    isAdmin: users.isAdmin, createdAt: users.createdAt
  }).from(users).orderBy(desc(users.createdAt));

  const userIds = allUsers.map(u => u.id);

  // Sessions count + last activity per user
  const sessionStats = userIds.length
    ? await db.select({
        userId: sessions.userId,
        sessionCount: sql<number>`count(${sessions.id})::int`,
        lastActivity: sql<Date | null>`max(${sessions.updatedAt})`,
        closedCount: sql<number>`count(*) filter (where ${sessions.currentRound} >= 3)::int`
      }).from(sessions).where(inArray(sessions.userId, userIds)).groupBy(sessions.userId)
    : [];

  // Files count + total bytes per user (via sessions join)
  const fileStats = userIds.length
    ? await db.select({
        userId: sessions.userId,
        fileCount: sql<number>`count(${files.id})::int`,
        totalBytes: sql<number>`coalesce(sum(${files.sizeBytes}),0)::bigint`
      }).from(files).innerJoin(sessions, eq(files.sessionId, sessions.id))
        .where(inArray(sessions.userId, userIds))
        .groupBy(sessions.userId)
    : [];

  // Messages count (cheap: count user messages = how many turns they had)
  const msgStats = userIds.length
    ? await db.select({
        userId: sessions.userId,
        userMessages: sql<number>`count(*) filter (where ${messages.role} = 'user')::int`
      }).from(messages).innerJoin(sessions, eq(messages.sessionId, sessions.id))
        .where(inArray(sessions.userId, userIds))
        .groupBy(sessions.userId)
    : [];

  const sessionById = new Map(sessionStats.map(s => [s.userId, s]));
  const fileById    = new Map(fileStats.map(s => [s.userId, s]));
  const msgById     = new Map(msgStats.map(s => [s.userId, s]));

  const enriched = allUsers.map(u => ({
    ...u,
    sessionCount: sessionById.get(u.id)?.sessionCount ?? 0,
    closedCount: sessionById.get(u.id)?.closedCount ?? 0,
    lastActivity: sessionById.get(u.id)?.lastActivity ?? null,
    fileCount: fileById.get(u.id)?.fileCount ?? 0,
    totalBytes: Number(fileById.get(u.id)?.totalBytes ?? 0),
    userMessages: msgById.get(u.id)?.userMessages ?? 0
  }));

  // Filter (client-side post-enrichment, da Mengen klein)
  const beforeSort = q
    ? enriched.filter(u =>
        u.email.toLowerCase().includes(q) ||
        (u.name ?? "").toLowerCase().includes(q)
      )
    : enriched;

  const filtered = [...beforeSort].sort((a, b) => {
    const cmp = (() => {
      switch (sortCol) {
        case "account":  return (a.name || a.email).localeCompare(b.name || b.email);
        case "sessions": return a.sessionCount - b.sessionCount;
        case "messages": return a.userMessages - b.userMessages;
        case "files":    return a.fileCount - b.fileCount;
        case "activity": return (a.lastActivity ? new Date(a.lastActivity).getTime() : 0) - (b.lastActivity ? new Date(b.lastActivity).getTime() : 0);
        case "created":
        default:         return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
    })();
    return cmp * dir;
  });

  return (
    <div className="max-w-5xl mx-auto w-full p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Users</h1>
        <p className="text-sm text-stone-600 mt-1">
          {filtered.length === enriched.length
            ? <>{enriched.length} Accounts insgesamt. Klick einen User um die Detail-Ansicht zu sehen.</>
            : <>{filtered.length} von {enriched.length} Accounts gefiltert</>}
        </p>
      </div>

      <div className="mb-4 flex items-stretch gap-2">
        <div className="flex-1">
          <AdminFilterBar placeholder="Filter nach Email oder Name..." />
        </div>
        <a href={`/api/admin/export/users${q ? `?q=${encodeURIComponent(q)}` : ""}`}
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
          <Link href={sortUrl("account")} className="col-span-3 hover:text-stone-900 transition-colors">Account{sortInd("account")}</Link>
          <Link href={sortUrl("sessions")} className="col-span-2 text-right hover:text-stone-900 transition-colors">Sessions{sortInd("sessions")}</Link>
          <Link href={sortUrl("messages")} className="col-span-2 text-right hover:text-stone-900 transition-colors">Messages{sortInd("messages")}</Link>
          <Link href={sortUrl("files")} className="col-span-2 text-right hover:text-stone-900 transition-colors">Files{sortInd("files")}</Link>
          <Link href={sortUrl("activity")} className="col-span-2 text-right hover:text-stone-900 transition-colors">Letzte Aktivität{sortInd("activity")}</Link>
          <div className="col-span-1 text-right">Aktion</div>
        </div>
        <ul className="divide-y divide-stone-200">
          {filtered.length === 0 && (
            <li className="p-6 text-sm text-stone-600 text-center">Kein Account passt zum Filter.</li>
          )}
          {filtered.map(u => {
            const isSelf = u.id === me.id;
            const last = u.lastActivity ? new Date(u.lastActivity) : null;
            const ago = last ? timeAgo(last) : "—";
            return (
              <li key={u.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-white/50 transition-colors">
                <div className="col-span-3 min-w-0">
                  <Link href={`/app/admin/users/${u.id}`} className="font-semibold text-stone-900 truncate hover:text-rose-800 transition-colors block">
                    {u.name || u.email}
                  </Link>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-stone-600 truncate">{u.email}</span>
                    {u.isAdmin && <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full font-bold text-white" style={{ background: "linear-gradient(180deg, #4C1D95, #BE123C)" }}>Admin</span>}
                    {isSelf && <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-stone-300 text-stone-700">Du</span>}
                  </div>
                </div>
                <div className="col-span-2 text-right text-sm">
                  <div className="text-stone-900 font-semibold">{u.sessionCount}</div>
                  {u.closedCount > 0 && <div className="text-xs text-stone-500">{u.closedCount} abgeschl.</div>}
                </div>
                <div className="col-span-2 text-right text-sm">
                  <div className="text-stone-900 font-medium">{u.userMessages}</div>
                </div>
                <div className="col-span-2 text-right text-sm">
                  <div className="text-stone-900 font-medium">{u.fileCount}</div>
                  {u.totalBytes > 0 && <div className="text-xs text-stone-500">{formatBytes(u.totalBytes)}</div>}
                </div>
                <div className="col-span-2 text-right text-xs text-stone-600">
                  {ago}
                </div>
                <div className="col-span-1 text-right">
                  <UsersClient userId={u.id} email={u.email} isSelf={isSelf} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
  } catch (e) {
    console.error("[admin/users] failed", e);
    return <AdminError where="Users" error={e} />;
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

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

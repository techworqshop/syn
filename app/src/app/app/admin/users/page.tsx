import Link from "next/link";
import { db } from "@/lib/db";
import { users, sessions, files, messages } from "@/db/schema";
import { requireAdmin } from "@/lib/current-user";
import { desc, eq, sql, inArray } from "drizzle-orm";
import UsersClient from "./UsersClient";
import AdminError from "@/components/admin/AdminError";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const me = await requireAdmin();

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

  return (
    <div className="max-w-5xl mx-auto w-full p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Users</h1>
        <p className="text-sm text-stone-600 mt-1">{enriched.length} Accounts insgesamt. Klick einen User um die Detail-Ansicht zu sehen.</p>
      </div>

      <div className="rounded-2xl border border-stone-300 bg-[#F3EFE2] overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-[11px] uppercase tracking-wide text-stone-600 font-bold border-b border-stone-300 bg-stone-100/60">
          <div className="col-span-3">Account</div>
          <div className="col-span-2 text-right">Sessions</div>
          <div className="col-span-2 text-right">Messages</div>
          <div className="col-span-2 text-right">Files</div>
          <div className="col-span-2 text-right">Letzte Aktivität</div>
          <div className="col-span-1 text-right">Aktion</div>
        </div>
        <ul className="divide-y divide-stone-200">
          {enriched.map(u => {
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

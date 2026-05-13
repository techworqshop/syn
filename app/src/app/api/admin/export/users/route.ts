import { db } from "@/lib/db";
import { users, sessions, files, messages } from "@/db/schema";
import { adminGuard } from "@/lib/current-user";
import { desc, eq, sql, inArray } from "drizzle-orm";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const denied = await adminGuard();
  if (denied) return denied;
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();

  const allUsers = await db.select({
    id: users.id, email: users.email, name: users.name,
    isAdmin: users.isAdmin, createdAt: users.createdAt
  }).from(users).orderBy(desc(users.createdAt));

  const ids = allUsers.map(u => u.id);
  const sStats = ids.length ? await db.select({
    userId: sessions.userId,
    sessionCount: sql<number>`count(${sessions.id})::int`,
    lastActivity: sql<Date | null>`max(${sessions.updatedAt})`,
    closedCount: sql<number>`count(*) filter (where ${sessions.currentRound} >= 3)::int`
  }).from(sessions).where(inArray(sessions.userId, ids)).groupBy(sessions.userId) : [];
  const fStats = ids.length ? await db.select({
    userId: sessions.userId,
    fileCount: sql<number>`count(${files.id})::int`,
    totalBytes: sql<number>`coalesce(sum(${files.sizeBytes}),0)::bigint`
  }).from(files).innerJoin(sessions, eq(files.sessionId, sessions.id))
    .where(inArray(sessions.userId, ids)).groupBy(sessions.userId) : [];
  const mStats = ids.length ? await db.select({
    userId: sessions.userId,
    userMessages: sql<number>`count(*) filter (where ${messages.role} = 'user')::int`
  }).from(messages).innerJoin(sessions, eq(messages.sessionId, sessions.id))
    .where(inArray(sessions.userId, ids)).groupBy(sessions.userId) : [];

  const sm = new Map(sStats.map(s => [s.userId, s]));
  const fm = new Map(fStats.map(s => [s.userId, s]));
  const mm = new Map(mStats.map(s => [s.userId, s]));

  let rows = allUsers.map(u => ({
    ...u,
    sessionCount: sm.get(u.id)?.sessionCount ?? 0,
    closedCount: sm.get(u.id)?.closedCount ?? 0,
    lastActivity: sm.get(u.id)?.lastActivity ?? null,
    fileCount: fm.get(u.id)?.fileCount ?? 0,
    totalBytes: Number(fm.get(u.id)?.totalBytes ?? 0),
    userMessages: mm.get(u.id)?.userMessages ?? 0
  }));
  if (q) rows = rows.filter(u => u.email.toLowerCase().includes(q) || (u.name ?? "").toLowerCase().includes(q));

  const header = ["user_id", "email", "name", "is_admin", "created_at", "session_count", "closed_count", "user_messages", "file_count", "total_bytes", "last_activity"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([
      r.id, r.email, r.name ?? "", r.isAdmin ? "true" : "false",
      new Date(r.createdAt).toISOString(),
      r.sessionCount, r.closedCount, r.userMessages, r.fileCount, r.totalBytes,
      r.lastActivity ? new Date(r.lastActivity).toISOString() : ""
    ].map(csvEscape).join(","));
  }
  const body = lines.join("\n") + "\n";
  const filename = `syn-users-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}

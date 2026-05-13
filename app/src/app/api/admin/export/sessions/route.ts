import { db } from "@/lib/db";
import { sessions, users } from "@/db/schema";
import { adminGuard } from "@/lib/current-user";
import { desc, eq, sql } from "drizzle-orm";

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
  const status = url.searchParams.get("status") || "all";
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const sort = url.searchParams.get("sort") || "updated:desc";

  const rows = await db
    .select({
      id: sessions.id,
      title: sessions.title,
      currentRound: sessions.currentRound,
      personaCount: sessions.personaCount,
      createdAt: sessions.createdAt,
      updatedAt: sessions.updatedAt,
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
        (r.userName ?? "").toLowerCase().includes(q))
    : byStatus;

  const [sortCol, sortDir] = sort.split(":");
  const dir = sortDir === "asc" ? 1 : -1;
  const sorted = [...beforeSort].sort((a, b) => {
    const cmp = (() => {
      switch (sortCol) {
        case "title":    return a.title.localeCompare(b.title);
        case "owner":    return (a.userName || a.userEmail).localeCompare(b.userName || b.userEmail);
        case "round":    return a.currentRound - b.currentRound;
        case "personas": return a.personaCount - b.personaCount;
        case "msgs":     return a.msgCount - b.msgCount;
        case "files":    return a.fileCount - b.fileCount;
        case "created":  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "updated":
        default:         return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
    })();
    return cmp * dir;
  });

  const header = ["session_id", "title", "owner_email", "owner_name", "current_round", "persona_count", "message_count", "file_count", "created_at", "updated_at"];
  const lines = [header.join(",")];
  for (const r of sorted) {
    lines.push([
      r.id, r.title, r.userEmail, r.userName ?? "",
      r.currentRound, r.personaCount, r.msgCount, r.fileCount,
      new Date(r.createdAt).toISOString(), new Date(r.updatedAt).toISOString()
    ].map(csvEscape).join(","));
  }
  const body = lines.join("\n") + "\n";
  const filename = `syn-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}

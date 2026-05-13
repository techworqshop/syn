import Link from "next/link";
import { db } from "@/lib/db";
import { sessions, users, messages } from "@/db/schema";
import { requireAdmin } from "@/lib/current-user";
import { desc, eq, sql, and, or, lt } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminErrorsPage() {
  await requireAdmin();

  // Letzte 50 system/error messages
  const errs = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      metadata: messages.metadata,
      createdAt: messages.createdAt,
      sessionId: messages.sessionId,
      sessionTitle: sessions.title,
      userId: sessions.userId,
      userEmail: users.email,
      userName: users.name
    })
    .from(messages)
    .innerJoin(sessions, eq(sessions.id, messages.sessionId))
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      or(
        eq(messages.role, "system"),
        sql`${messages.metadata}->>'kind' = 'error'`
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(50);

  // Stuck Sessions: status != closed AND last updated > 10 Min ago AND has user message after last coordinator msg (waiting state).
  // Simple version: sessions with currentRound < 3 + last update > 15 Min ago + last message ist user-Message
  type StuckRow = {
    id: string; title: string; current_round: number; updated_at: Date;
    user_id: string; user_email: string; user_name: string | null;
    last_role: string; minutes_idle: number;
  };
  const stuckRawResult = await db.execute<StuckRow>(sql`
    WITH last_msg AS (
      SELECT DISTINCT ON (session_id) session_id, role, created_at
      FROM messages
      ORDER BY session_id, created_at DESC
    )
    SELECT s.id, s.title, s.current_round, s.updated_at,
           u.id AS user_id, u.email AS user_email, u.name AS user_name,
           lm.role AS last_role,
           EXTRACT(EPOCH FROM (now() - s.updated_at))/60 AS minutes_idle
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN last_msg lm ON lm.session_id = s.id
    WHERE s.current_round < 3
      AND s.updated_at < now() - interval '15 minutes'
      AND (lm.role = 'user' OR lm.role IS NULL)
    ORDER BY s.updated_at DESC
    LIMIT 20
  `);
  const stuckRaw = stuckRawResult as unknown as StuckRow[];

  return (
    <div className="max-w-5xl mx-auto w-full p-6">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900 mb-6">Errors &amp; Stuck Sessions</h1>

      <section className="mb-8">
        <h2 className="text-sm uppercase tracking-wide font-bold text-stone-700 mb-3">Stuck Sessions ({stuckRaw.length})</h2>
        <p className="text-xs text-stone-600 mb-3">Offene Sessions wo der User auf Antwort wartet (letzte Message vom User, &gt;15 Min inaktiv).</p>
        <div className="rounded-2xl border border-stone-300 bg-[#F3EFE2] overflow-hidden shadow-sm">
          {stuckRaw.length === 0 ? (
            <div className="p-6 text-sm text-stone-600 text-center">Keine hängenden Sessions. 👍</div>
          ) : (
            <ul className="divide-y divide-stone-200">
              {stuckRaw.map(r => (
                <li key={r.id} className="px-4 py-3 hover:bg-white/40 transition-colors">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="font-medium text-stone-900 truncate">{r.title}</div>
                    <div className="text-xs text-red-700 font-medium shrink-0">{Math.round(r.minutes_idle)} Min idle</div>
                  </div>
                  <div className="text-xs text-stone-600 mt-0.5">
                    Runde {r.current_round} ·
                    <Link href={`/app/admin/users/${r.user_id}`} className="ml-1 hover:text-rose-800 transition-colors">
                      {r.user_name || r.user_email}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wide font-bold text-stone-700 mb-3">Letzte 50 Errors</h2>
        <div className="rounded-2xl border border-stone-300 bg-[#F3EFE2] overflow-hidden shadow-sm">
          {errs.length === 0 ? (
            <div className="p-6 text-sm text-stone-600 text-center">Keine Errors. 🎉</div>
          ) : (
            <ul className="divide-y divide-stone-200">
              {errs.map(e => (
                <li key={e.id} className="px-4 py-3 hover:bg-white/40 transition-colors">
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-700/40 font-bold shrink-0">
                        {e.role === "system" ? "SYS" : "ERR"}
                      </span>
                      <span className="font-medium text-stone-900 truncate">{e.sessionTitle}</span>
                    </div>
                    <div className="text-xs text-stone-500 shrink-0">{new Date(e.createdAt).toLocaleString("de-DE")}</div>
                  </div>
                  <div className="text-xs text-stone-700 line-clamp-2 ml-1">{e.content}</div>
                  <div className="text-xs text-stone-500 mt-1 ml-1">
                    <Link href={`/app/admin/users/${e.userId}`} className="hover:text-rose-800 transition-colors">
                      {e.userName || e.userEmail}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { users, sessions, files, messages, audienceMessages } from "@/db/schema";
import { requireAdmin } from "@/lib/current-user";
import { eq, desc, sql } from "drizzle-orm";
import AdminError from "@/components/admin/AdminError";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ id: string }> };

export default async function AdminUserDetailPage({ params }: P) {
  await requireAdmin();
  try {
  const { id } = await params;

  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!u) return notFound();

  const userSessions = await db.select({
    id: sessions.id,
    title: sessions.title,
    status: sessions.status,
    currentRound: sessions.currentRound,
    personaCount: sessions.personaCount,
    createdAt: sessions.createdAt,
    updatedAt: sessions.updatedAt
  }).from(sessions).where(eq(sessions.userId, id)).orderBy(desc(sessions.updatedAt));

  // Aggregations (independent of sessionIds — joins direkt auf user_id)
  type StatsRow = { session_count: number; msg_count: number; file_count: number; bytes_total: string; audience_count: number };
  const statsRaw = await db.execute<StatsRow>(
    sql`SELECT
          (SELECT count(*) FROM ${sessions} WHERE ${sessions.userId} = ${id})::int AS session_count,
          (SELECT count(*) FROM ${messages} m JOIN ${sessions} s ON s.id = m.session_id WHERE s.user_id = ${id} AND m.role = 'user')::int AS msg_count,
          (SELECT count(*) FROM ${files} f JOIN ${sessions} s ON s.id = f.session_id WHERE s.user_id = ${id})::int AS file_count,
          (SELECT coalesce(sum(f.size_bytes),0) FROM ${files} f JOIN ${sessions} s ON s.id = f.session_id WHERE s.user_id = ${id})::bigint AS bytes_total,
          (SELECT count(*) FROM ${audienceMessages} a JOIN ${sessions} s ON s.id = a.session_id WHERE s.user_id = ${id} AND a.role = 'user')::int AS audience_count
        `
  );
  const stats = statsRaw as unknown as StatsRow[];
  const s = stats[0] ?? { session_count: 0, msg_count: 0, file_count: 0, bytes_total: "0", audience_count: 0 };

  // Activity-Timeline: letzte 30 Aktionen quer durch Sessions
  type TimelineRow = { kind: string; session_id: string; session_title: string; preview: string; created_at: Date };
  const timelineRaw = await db.execute<TimelineRow>(
    sql`
      (SELECT 'session_created' AS kind, ${sessions.id} AS session_id, ${sessions.title} AS session_title,
              'Neue Fokusgruppe' AS preview, ${sessions.createdAt} AS created_at
         FROM ${sessions} WHERE ${sessions.userId} = ${id})
      UNION ALL
      (SELECT 'user_message' AS kind, s.id AS session_id, s.title AS session_title,
              substring(m.content, 1, 80) AS preview, m.created_at
         FROM ${messages} m JOIN ${sessions} s ON s.id = m.session_id
         WHERE s.user_id = ${id} AND m.role = 'user')
      UNION ALL
      (SELECT 'file_upload' AS kind, s.id AS session_id, s.title AS session_title,
              f.file_name AS preview, f.created_at
         FROM ${files} f JOIN ${sessions} s ON s.id = f.session_id
         WHERE s.user_id = ${id})
      ORDER BY created_at DESC
      LIMIT 30
    `
  );
  const timeline = timelineRaw as unknown as TimelineRow[];

  return (
    <div className="max-w-5xl mx-auto w-full p-6">
      <div className="mb-4">
        <Link href="/app/admin/users" className="text-sm text-stone-600 hover:text-stone-900 font-medium">← Alle Users</Link>
      </div>

      <div className="rounded-2xl border border-stone-300 bg-[#F3EFE2] p-5 shadow-sm mb-6">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{u.name || u.email}</h1>
          {u.isAdmin && <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-bold text-white" style={{ background: "linear-gradient(180deg, #4C1D95, #BE123C)" }}>Admin</span>}
        </div>
        <div className="text-sm text-stone-600 mt-1">{u.email} · Account erstellt {new Date(u.createdAt).toLocaleString("de-DE")}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Stat label="Sessions" value={s.session_count} />
        <Stat label="Eigene Messages" value={s.msg_count} />
        <Stat label="Files" value={s.file_count} sub={Number(s.bytes_total) > 0 ? formatBytes(Number(s.bytes_total)) : undefined} />
        <Stat label="Audience-Fragen" value={s.audience_count} sub="(1:1 Interviews)" />
        <Stat label="Abgeschlossen" value={userSessions.filter(x => x.currentRound >= 3).length} sub={`von ${s.session_count}`} />
      </div>

      <h2 className="text-sm uppercase tracking-wide font-bold text-stone-700 mb-3">Sessions ({userSessions.length})</h2>
      <div className="rounded-2xl border border-stone-300 bg-[#F3EFE2] overflow-hidden mb-8 shadow-sm">
        {userSessions.length === 0 ? (
          <div className="p-6 text-sm text-stone-600 text-center">Noch keine Sessions.</div>
        ) : (
          <ul className="divide-y divide-stone-200">
            {userSessions.map(s => (
              <li key={s.id}>
                <Link href={`/app/admin/sessions/${s.id}`} className="px-4 py-3 hover:bg-white/40 transition-colors flex items-center gap-3 group">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-stone-900 truncate group-hover:text-rose-800 transition-colors">{s.title}</div>
                    <div className="text-xs text-stone-600 mt-0.5">
                      Runde {s.currentRound} · {s.personaCount} Personas · Aktualisiert {new Date(s.updatedAt).toLocaleString("de-DE")}
                    </div>
                  </div>
                  {s.currentRound >= 3 && (
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-bold text-white" style={{ background: "linear-gradient(180deg, #4C1D95, #BE123C)" }}>Abgeschlossen</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2 className="text-sm uppercase tracking-wide font-bold text-stone-700 mb-3">Aktivität (letzte 30)</h2>
      <div className="rounded-2xl border border-stone-300 bg-[#F3EFE2] overflow-hidden shadow-sm">
        {timeline.length === 0 ? (
          <div className="p-6 text-sm text-stone-600 text-center">Keine Aktivität.</div>
        ) : (
          <ul className="divide-y divide-stone-200">
            {timeline.map((row, i) => (
              <li key={i} className="px-4 py-2.5 text-sm flex items-center gap-3">
                <span className="text-xs uppercase tracking-wide font-bold w-32 shrink-0" style={{ color: kindColor(row.kind) }}>
                  {kindLabel(row.kind)}
                </span>
                <span className="text-stone-800 flex-1 min-w-0 truncate">{row.preview}</span>
                <span className="text-xs text-stone-500 shrink-0">{new Date(row.created_at).toLocaleString("de-DE")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
  } catch (e) {
    console.error("[admin/user-detail] failed", e);
    return <AdminError where="User-Detail" error={e} />;
  }
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-stone-300 bg-[#F3EFE2] p-3 shadow-sm">
      <div className="text-[10px] uppercase tracking-wide text-stone-600 font-bold">{label}</div>
      <div className="text-2xl font-semibold text-stone-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-stone-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function kindLabel(k: string): string {
  if (k === "session_created") return "Session";
  if (k === "user_message") return "Nachricht";
  if (k === "file_upload") return "Upload";
  return k;
}
function kindColor(k: string): string {
  if (k === "session_created") return "#BE123C";
  if (k === "user_message") return "#5FA28F";
  if (k === "file_upload") return "#A77E22";
  return "#666";
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

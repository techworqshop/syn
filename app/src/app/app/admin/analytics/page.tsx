import Link from "next/link";
import { db } from "@/lib/db";
import { sessions, users, files, messages, audienceMessages } from "@/db/schema";
import { requireAdmin } from "@/lib/current-user";
import { desc, eq, sql, gte } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Range = "7d" | "30d" | "90d" | "all";

function rangeStart(r: Range): Date | null {
  const days = r === "7d" ? 7 : r === "30d" ? 30 : r === "90d" ? 90 : 0;
  if (!days) return null;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export default async function AdminAnalyticsPage({
  searchParams
}: { searchParams: Promise<{ range?: Range }> }) {
  await requireAdmin();
  const params = await searchParams;
  const range: Range = (params.range as Range) || "30d";
  const since = rangeStart(range);

  const sinceClause = since ? sql`>= ${since}` : sql`> '1970-01-01'::timestamptz`;

  // Core counters (im Range bzw. all-time)
  type Counters = {
    total_users: number;
    total_sessions: number;
    closed_sessions: number;
    total_messages: number;
    user_messages: number;
    total_files: number;
    total_bytes: string;
    total_reports: number;
    total_audience_msgs: number;
    new_users: number;
    new_sessions: number;
  };
  const countersRaw = await db.execute<Counters>(sql`
    SELECT
      (SELECT count(*) FROM users)::int AS total_users,
      (SELECT count(*) FROM sessions)::int AS total_sessions,
      (SELECT count(*) FROM sessions WHERE current_round >= 3)::int AS closed_sessions,
      (SELECT count(*) FROM messages WHERE created_at ${sinceClause})::int AS total_messages,
      (SELECT count(*) FROM messages WHERE role = 'user' AND created_at ${sinceClause})::int AS user_messages,
      (SELECT count(*) FROM files)::int AS total_files,
      (SELECT coalesce(sum(size_bytes),0) FROM files)::bigint AS total_bytes,
      (SELECT count(*) FROM messages WHERE metadata->>'kind' = 'report')::int AS total_reports,
      (SELECT count(*) FROM audience_messages WHERE role = 'user' AND created_at ${sinceClause})::int AS total_audience_msgs,
      (SELECT count(*) FROM users WHERE created_at ${sinceClause})::int AS new_users,
      (SELECT count(*) FROM sessions WHERE created_at ${sinceClause})::int AS new_sessions
  `);
  const counters = countersRaw as unknown as Counters[];
  const c = counters[0];

  // Sessions per Tag (max 90 buckets)
  type SeriesRow = { day: string; sessions: number; messages: number };
  const seriesRaw = await db.execute<SeriesRow>(sql`
    WITH days AS (
      SELECT generate_series(
        date_trunc('day', now() - interval '${sql.raw(range === '7d' ? '6' : range === '30d' ? '29' : range === '90d' ? '89' : '29')} days'),
        date_trunc('day', now()),
        interval '1 day'
      ) AS day
    )
    SELECT
      to_char(d.day, 'YYYY-MM-DD') AS day,
      (SELECT count(*) FROM sessions WHERE date_trunc('day', created_at) = d.day)::int AS sessions,
      (SELECT count(*) FROM messages WHERE role = 'user' AND date_trunc('day', created_at) = d.day)::int AS messages
    FROM days d
    ORDER BY d.day ASC
  `);

  const series = seriesRaw as unknown as SeriesRow[];

  // Top User by activity (sessions + messages combined score)
  type TopUser = { id: string; email: string; name: string | null; session_count: number; msg_count: number; file_count: number };
  const topUsersRaw = await db.execute<TopUser>(sql`
    SELECT u.id, u.email, u.name,
      (SELECT count(*) FROM sessions s WHERE s.user_id = u.id AND s.created_at ${sinceClause})::int AS session_count,
      (SELECT count(*) FROM messages m JOIN sessions s ON s.id = m.session_id WHERE s.user_id = u.id AND m.role = 'user' AND m.created_at ${sinceClause})::int AS msg_count,
      (SELECT count(*) FROM files f JOIN sessions s ON s.id = f.session_id WHERE s.user_id = u.id)::int AS file_count
    FROM users u
    ORDER BY session_count DESC, msg_count DESC
    LIMIT 10
  `);
  const topUsers = topUsersRaw as unknown as TopUser[];

  const closeRate = c.total_sessions > 0 ? Math.round((c.closed_sessions / c.total_sessions) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto w-full p-6">
      <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Analytics</h1>
          <p className="text-sm text-stone-600 mt-1">Nutzungsdaten · {rangeLabel(range)}</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-stone-200 p-1">
          {(["7d","30d","90d","all"] as const).map(r => (
            <Link key={r} href={`/app/admin/analytics?range=${r}`}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                range === r ? "bg-white text-stone-900 shadow-sm" : "text-stone-700 hover:bg-white/60"
              }`}>
              {rangeLabel(r)}
            </Link>
          ))}
        </div>
      </div>

      {/* Counter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card label="User insgesamt" value={c.total_users} sub={`+${c.new_users} im Zeitraum`} />
        <Card label="Sessions" value={c.total_sessions} sub={`+${c.new_sessions} im Zeitraum · ${closeRate}% abgeschlossen`} />
        <Card label="User-Messages" value={c.user_messages} sub={`${c.total_messages} gesamt im Zeitraum`} />
        <Card label="1:1-Audience" value={c.total_audience_msgs} sub="Fragen an Personas" />
        <Card label="Files hochgeladen" value={c.total_files} sub={formatBytes(Number(c.total_bytes ?? 0))} />
        <Card label="Reports generiert" value={c.total_reports} sub="Abschlussberichte (all-time)" />
        <Card label="Abgeschlossen" value={c.closed_sessions} sub={`${closeRate}% Closing-Rate`} />
        <Card label="Avg Msgs/Session" value={c.total_sessions > 0 ? Math.round((c.user_messages / c.total_sessions) * 10) / 10 : 0} sub="User-Turns pro Session" />
      </div>

      {/* Sparkline-Chart */}
      <div className="rounded-2xl border border-stone-300 bg-[#F3EFE2] p-5 shadow-sm mb-6">
        <h2 className="text-sm uppercase tracking-wide font-bold text-stone-700 mb-3">Sessions & User-Messages pro Tag</h2>
        <SparklineChart data={series} />
      </div>

      {/* Top User */}
      <div className="rounded-2xl border border-stone-300 bg-[#F3EFE2] overflow-hidden shadow-sm">
        <h2 className="text-sm uppercase tracking-wide font-bold text-stone-700 px-4 pt-4 pb-2">Top 10 aktive User</h2>
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[11px] uppercase tracking-wide text-stone-600 font-bold border-b border-stone-300 bg-stone-100/60">
          <div className="col-span-5">User</div>
          <div className="col-span-2 text-right">Sessions</div>
          <div className="col-span-2 text-right">Messages</div>
          <div className="col-span-2 text-right">Files</div>
          <div className="col-span-1 text-right">Aktion</div>
        </div>
        <ul className="divide-y divide-stone-200">
          {topUsers.map(u => (
            <li key={u.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-white/40 transition-colors">
              <div className="col-span-5 min-w-0">
                <Link href={`/app/admin/users/${u.id}`} className="font-medium text-stone-900 hover:text-rose-800 truncate block transition-colors">
                  {u.name || u.email}
                </Link>
                <div className="text-xs text-stone-600 truncate">{u.email}</div>
              </div>
              <div className="col-span-2 text-right text-sm text-stone-900 font-semibold">{u.session_count}</div>
              <div className="col-span-2 text-right text-sm text-stone-700">{u.msg_count}</div>
              <div className="col-span-2 text-right text-sm text-stone-700">{u.file_count}</div>
              <div className="col-span-1 text-right">
                <Link href={`/app/admin/users/${u.id}`} className="text-xs text-rose-800 hover:underline">
                  →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function rangeLabel(r: Range): string {
  return r === "7d" ? "7 Tage" : r === "30d" ? "30 Tage" : r === "90d" ? "90 Tage" : "Gesamt";
}

function Card({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-stone-300 bg-[#F3EFE2] p-4 shadow-sm">
      <div className="text-[10px] uppercase tracking-wide text-stone-600 font-bold">{label}</div>
      <div className="text-2xl font-semibold text-stone-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-stone-500 mt-1">{sub}</div>}
    </div>
  );
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function SparklineChart({ data }: { data: Array<{ day: string; sessions: number; messages: number }> }) {
  if (!data || data.length === 0) return <div className="text-sm text-stone-500">Keine Daten.</div>;
  const w = 1000, h = 180, pad = { l: 36, r: 12, t: 12, b: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const maxV = Math.max(1, ...data.map(d => Math.max(d.sessions, Math.ceil(d.messages / 4))));
  const xStep = innerW / Math.max(1, data.length - 1);
  const yScale = (v: number) => innerH - (v / maxV) * innerH;

  const sessionLine = data.map((d, i) => `${i === 0 ? "M" : "L"} ${pad.l + i * xStep} ${pad.t + yScale(d.sessions)}`).join(" ");
  const msgLine = data.map((d, i) => `${i === 0 ? "M" : "L"} ${pad.l + i * xStep} ${pad.t + yScale(d.messages / 4)}`).join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* gridlines + y labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const y = pad.t + innerH * (1 - p);
          return (
            <g key={i}>
              <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="#d6d3d1" strokeWidth={0.5} />
              <text x={pad.l - 6} y={y + 3} fontSize="9" fill="#78716c" textAnchor="end">{Math.round(maxV * p)}</text>
            </g>
          );
        })}
        {/* x-axis labels: first, mid, last */}
        {[0, Math.floor(data.length / 2), data.length - 1].map(i => (
          <text key={i} x={pad.l + i * xStep} y={h - 8} fontSize="9" fill="#78716c" textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}>
            {data[i]?.day.slice(5)}
          </text>
        ))}
        {/* sessions area */}
        <path d={`${sessionLine} L ${pad.l + (data.length - 1) * xStep} ${pad.t + innerH} L ${pad.l} ${pad.t + innerH} Z`}
              fill="url(#sessGrad)" opacity={0.25} />
        <path d={sessionLine} fill="none" stroke="#BE123C" strokeWidth={2} />
        <path d={msgLine} fill="none" stroke="#5FA28F" strokeWidth={1.5} strokeDasharray="3 2" />
        <defs>
          <linearGradient id="sessGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#BE123C" />
            <stop offset="100%" stopColor="#BE123C" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex gap-4 mt-2 text-xs text-stone-600">
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5" style={{ background: "#BE123C" }} /> Sessions</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 border-t border-dashed" style={{ borderColor: "#5FA28F" }} /> Messages (÷4)</span>
      </div>
    </div>
  );
}

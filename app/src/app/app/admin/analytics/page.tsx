import Link from "next/link";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/current-user";
import { fetchTokenTotals } from "@/lib/n8n-db";
import AdminError from "@/components/admin/AdminError";
import AdminFilterBar from "@/components/admin/AdminFilterBar";

export const dynamic = "force-dynamic";

type Range = "7d" | "30d" | "90d" | "all";

function rangeStart(r: Range): Date | null {
  const days = r === "7d" ? 7 : r === "30d" ? 30 : r === "90d" ? 90 : 0;
  if (!days) return null;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export default async function AdminAnalyticsPage({
  searchParams
}: { searchParams: Promise<{ range?: Range; q?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const range: Range = (params.range as Range) || "30d";
  const q = (params.q ?? "").trim().toLowerCase();
  const since = rangeStart(range);
  const daysBack = range === "7d" ? 6 : range === "30d" ? 29 : range === "90d" ? 89 : 29;

  // Range-Klausel als wiederverwendbare SQL-Fragment
  // postgres-js will pass a Date object as-is, which Buffer.byteLength chokes on.
  // Convert to ISO string + cast to timestamptz on the SQL side.
  const sinceISO = since ? since.toISOString() : null;
  const sinceClause = sinceISO ? sql`>= ${sinceISO}::timestamptz` : sql`> '1970-01-01'::timestamptz`;

  // === DB-Queries in try/catch -- so sehen wir den echten Stack ===
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
  type SeriesRow = { day: string; sessions: number; messages: number };
  type TopUser = { id: string; email: string; name: string | null; session_count: number; msg_count: number; file_count: number };
  type FunnelRow = { stage: string; n: number };
  type HourRow = { hour: number; user_msgs: number; sessions_started: number };
  type FileCatRow = { category: string; cnt: number; bytes_total: string };
  type DurationRow = { avg_minutes: string | null; median_minutes: string | null; longest_minutes: string | null };

  let c: Counters;
  let series: SeriesRow[];
  let topUsers: TopUser[];
  let funnel: FunnelRow[];
  let hours: HourRow[];
  let fileCats: FileCatRow[];
  let duration: DurationRow;
  let tokens: { input: number; output: number; total: number; calls: number; executions: number } | null = null;
  let tokensError: string | null = null;
  try {
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
    c = counters[0] ?? {
      total_users: 0, total_sessions: 0, closed_sessions: 0, total_messages: 0,
      user_messages: 0, total_files: 0, total_bytes: "0", total_reports: 0,
      total_audience_msgs: 0, new_users: 0, new_sessions: 0
    };

    // Tages-Serie -- daysBack als Parameter + ::interval-Cast (kein sql.raw mehr in einem String-Literal)
    const seriesRaw = await db.execute<SeriesRow>(sql`
      WITH days AS (
        SELECT generate_series(
          date_trunc('day', now() - (${daysBack} || ' days')::interval),
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
    series = seriesRaw as unknown as SeriesRow[];

    const topUsersRaw = await db.execute<TopUser>(sql`
      SELECT u.id, u.email, u.name,
        (SELECT count(*) FROM sessions s WHERE s.user_id = u.id AND s.created_at ${sinceClause})::int AS session_count,
        (SELECT count(*) FROM messages m JOIN sessions s ON s.id = m.session_id WHERE s.user_id = u.id AND m.role = 'user' AND m.created_at ${sinceClause})::int AS msg_count,
        (SELECT count(*) FROM files f JOIN sessions s ON s.id = f.session_id WHERE s.user_id = u.id)::int AS file_count
      FROM users u
      ORDER BY session_count DESC, msg_count DESC
      LIMIT 10
    `);
    topUsers = topUsersRaw as unknown as TopUser[];

    // --- Funnel: created -> started -> R1 -> R2 -> R3 -> Report (im Range) ---
    const funnelRaw = await db.execute<FunnelRow>(sql`
      WITH s AS (
        SELECT id, current_round FROM sessions WHERE created_at ${sinceClause}
      ),
      msg AS (
        SELECT DISTINCT session_id FROM messages WHERE role = 'user'
      ),
      rpt AS (
        SELECT DISTINCT session_id FROM messages WHERE metadata->>'kind' = 'report'
      )
      SELECT 'erstellt' AS stage, count(*)::int AS n FROM s
      UNION ALL SELECT 'gestartet', (SELECT count(*) FROM s WHERE id IN (SELECT session_id FROM msg))::int
      UNION ALL SELECT 'runde_1', (SELECT count(*) FROM s WHERE current_round >= 1)::int
      UNION ALL SELECT 'runde_2', (SELECT count(*) FROM s WHERE current_round >= 2)::int
      UNION ALL SELECT 'runde_3', (SELECT count(*) FROM s WHERE current_round >= 3)::int
      UNION ALL SELECT 'report', (SELECT count(*) FROM s WHERE id IN (SELECT session_id FROM rpt))::int
    `);
    funnel = funnelRaw as unknown as FunnelRow[];

    // --- Stunden-Verteilung der Aktivitaet (User-Messages + Session-Starts) ---
    const hoursRaw = await db.execute<HourRow>(sql`
      WITH h AS (SELECT generate_series(0, 23) AS hour)
      SELECT
        h.hour::int,
        (SELECT count(*) FROM messages WHERE role='user' AND created_at ${sinceClause} AND EXTRACT(HOUR FROM created_at) = h.hour)::int AS user_msgs,
        (SELECT count(*) FROM sessions WHERE created_at ${sinceClause} AND EXTRACT(HOUR FROM created_at) = h.hour)::int AS sessions_started
      FROM h
      ORDER BY h.hour
    `);
    hours = hoursRaw as unknown as HourRow[];

    // --- Files nach Kategorie ---
    const fileCatsRaw = await db.execute<FileCatRow>(sql`
      SELECT category, count(*)::int AS cnt, coalesce(sum(size_bytes),0)::bigint AS bytes_total
      FROM files
      JOIN sessions ON sessions.id = files.session_id
      WHERE files.created_at ${sinceClause}
      GROUP BY category
      ORDER BY cnt DESC
    `);
    fileCats = fileCatsRaw as unknown as FileCatRow[];

    // --- Session-Dauer: min->max User-Message-Zeitstempel ---
    const durationRaw = await db.execute<DurationRow>(sql`
      WITH per_session AS (
        SELECT s.id,
               EXTRACT(EPOCH FROM (max(m.created_at) - min(m.created_at)))/60.0 AS minutes
        FROM sessions s JOIN messages m ON m.session_id = s.id
        WHERE s.created_at ${sinceClause}
        GROUP BY s.id
        HAVING count(m.id) >= 2
      )
      SELECT
        round(avg(minutes)::numeric, 1)::text AS avg_minutes,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY minutes)::text AS median_minutes,
        round(max(minutes)::numeric, 1)::text AS longest_minutes
      FROM per_session
    `);
    const dur = durationRaw as unknown as DurationRow[];
    duration = dur[0] ?? { avg_minutes: null, median_minutes: null, longest_minutes: null };

  } catch (e) {
    console.error("[admin/analytics] DB query failed", e);
    return <AdminError where="Analytics" error={e} />;
  }

  // Token-Sync aus n8n separat — wenn n8n unerreichbar ist, bricht nicht
  // die ganze Seite zusammen, sondern wir zeigen nur eine kleine Fehlermeldung
  // an der Token-Karte.
  try {
    tokens = await fetchTokenTotals(sinceISO);
  } catch (e) {
    console.error("[admin/analytics] n8n token sync failed", e);
    tokensError = e instanceof Error ? e.message : "n8n unerreichbar";
  }

  const funnelMap = Object.fromEntries(funnel.map(f => [f.stage, f.n]));
  const funnelMax = Math.max(1, ...funnel.map(f => f.n));

  const closeRate = c.total_sessions > 0 ? Math.round((c.closed_sessions / c.total_sessions) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto w-full p-6">
      <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Analytics</h1>
          <p className="text-sm text-stone-600 mt-1">Nutzungsdaten · {rangeLabel(range)}</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-stone-200 p-1">
          {(["7d","30d","90d","all"] as const).map(r => {
            const url = q
              ? `/app/admin/analytics?range=${r}&q=${encodeURIComponent(q)}`
              : `/app/admin/analytics?range=${r}`;
            return (
              <Link key={r} href={url}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  range === r ? "bg-white text-stone-900 shadow-sm" : "text-stone-700 hover:bg-white/60"
                }`}>
                {rangeLabel(r)}
              </Link>
            );
          })}
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
        <Card label="Ø Session-Dauer" value={duration.avg_minutes ? `${duration.avg_minutes} Min` : "—"} sub={duration.median_minutes ? `Median ${Math.round(Number(duration.median_minutes) * 10) / 10} Min` : undefined} />
        <Card
          label="LLM-Tokens"
          value={tokens ? formatCompact(tokens.total) : (tokensError ? "—" : "—")}
          sub={
            tokens
              ? `${formatCompact(tokens.input)} in · ${formatCompact(tokens.output)} out · ${tokens.calls} calls`
              : tokensError
                ? `n8n nicht erreichbar`
                : "lade..."
          }
        />
      </div>

      {/* Funnel */}
      <div className="rounded-2xl border border-stone-300 bg-[#F3EFE2] p-5 shadow-sm mb-6">
        <h2 className="text-sm uppercase tracking-wide font-bold text-stone-700 mb-3">Funnel: Created → Report</h2>
        <FunnelChart funnel={funnel} max={funnelMax} />
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-stone-600">
          {funnel.length >= 6 && (
            <>
              <div><strong className="text-stone-900">Start-Rate</strong>: {pct(funnelMap.gestartet, funnelMap.erstellt)} (erstellt → gestartet)</div>
              <div><strong className="text-stone-900">R1-Completion</strong>: {pct(funnelMap.runde_1, funnelMap.gestartet)}</div>
              <div><strong className="text-stone-900">R2-Completion</strong>: {pct(funnelMap.runde_2, funnelMap.runde_1)}</div>
              <div><strong className="text-stone-900">R3-Completion</strong>: {pct(funnelMap.runde_3, funnelMap.runde_2)}</div>
              <div><strong className="text-stone-900">Report-Rate</strong>: {pct(funnelMap.report, funnelMap.runde_3)} (R3 → Report)</div>
              <div><strong className="text-stone-900">Total Drop-off</strong>: {pct(funnelMap.erstellt - funnelMap.report, funnelMap.erstellt)} verloren</div>
            </>
          )}
        </div>
      </div>

      {/* Tages-Verlauf (Bar) */}
      <div className="rounded-2xl border border-stone-300 bg-[#F3EFE2] p-5 shadow-sm mb-6">
        <h2 className="text-sm uppercase tracking-wide font-bold text-stone-700 mb-3">Aktivität pro Tag</h2>
        <BarChart data={series} />
      </div>

      {/* Hourly Heatmap + File-Cats nebeneinander */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-stone-300 bg-[#F3EFE2] p-5 shadow-sm">
          <h2 className="text-sm uppercase tracking-wide font-bold text-stone-700 mb-3">Tagesverteilung (Stunden)</h2>
          <HourChart data={hours} />
        </div>
        <div className="rounded-2xl border border-stone-300 bg-[#F3EFE2] p-5 shadow-sm">
          <h2 className="text-sm uppercase tracking-wide font-bold text-stone-700 mb-3">Dateien nach Kategorie</h2>
          <FileCatList rows={fileCats} />
        </div>
      </div>

      {/* Top User */}
      <div className="mb-3">
        <AdminFilterBar placeholder="Top User filtern (Email oder Name)..." />
      </div>
      {(() => {
        const filtered = q
          ? topUsers.filter(u => u.email.toLowerCase().includes(q) || (u.name ?? "").toLowerCase().includes(q))
          : topUsers;
      return (
      <div className="rounded-2xl border border-stone-300 bg-[#F3EFE2] overflow-hidden shadow-sm">
        <h2 className="text-sm uppercase tracking-wide font-bold text-stone-700 px-4 pt-4 pb-2">Top 10 aktive User{q && filtered.length !== topUsers.length ? ` (${filtered.length} gefiltert)` : ""}</h2>
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[11px] uppercase tracking-wide text-stone-600 font-bold border-b border-stone-300 bg-stone-100/60">
          <div className="col-span-5">User</div>
          <div className="col-span-2 text-right">Sessions</div>
          <div className="col-span-2 text-right">Messages</div>
          <div className="col-span-2 text-right">Files</div>
          <div className="col-span-1 text-right">Aktion</div>
        </div>
        <ul className="divide-y divide-stone-200">
          {filtered.length === 0 && (
            <li className="p-6 text-sm text-stone-600 text-center">Kein User passt zum Filter.</li>
          )}
          {filtered.map(u => (
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
      );
      })()}
    </div>
  );
}

function rangeLabel(r: Range): string {
  return r === "7d" ? "7 Tage" : r === "30d" ? "30 Tage" : r === "90d" ? "90 Tage" : "Gesamt";
}

function Card({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
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

function formatCompact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  return `${(n / 1_000_000_000).toFixed(2)}B`;
}

function pct(num: number, denom: number): string {
  if (!denom || denom <= 0) return "—";
  return `${Math.round((num / denom) * 100)}%`;
}

const STAGE_LABEL: Record<string, string> = {
  erstellt: "Erstellt",
  gestartet: "Gestartet",
  runde_1: "Runde 1",
  runde_2: "Runde 2",
  runde_3: "Runde 3",
  report: "Report"
};
const STAGE_ORDER = ["erstellt", "gestartet", "runde_1", "runde_2", "runde_3", "report"];

function FunnelChart({ funnel, max }: { funnel: Array<{ stage: string; n: number }>; max: number }) {
  const byStage = Object.fromEntries(funnel.map(f => [f.stage, f.n]));
  return (
    <div className="space-y-1.5">
      {STAGE_ORDER.map(s => {
        const n = byStage[s] ?? 0;
        const w = (n / max) * 100;
        return (
          <div key={s} className="flex items-center gap-3">
            <div className="w-24 text-xs text-stone-700 font-medium">{STAGE_LABEL[s] || s}</div>
            <div className="flex-1 relative h-7 rounded-md bg-stone-100 overflow-hidden">
              <div className="absolute inset-y-0 left-0 rounded-md flex items-center justify-end px-2 transition-all"
                style={{ width: `${Math.max(w, n > 0 ? 4 : 0)}%`, background: "linear-gradient(90deg, #4C1D95, #BE123C)" }}>
                {w >= 12 && <span className="text-xs font-semibold text-white">{n}</span>}
              </div>
              {w < 12 && n > 0 && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-700">{n}</span>}
              {n === 0 && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-stone-500">0</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BarChart({ data }: { data: Array<{ day: string; sessions: number; messages: number }> }) {
  if (!data || data.length === 0) return <div className="text-sm text-stone-500">Keine Daten.</div>;
  const w = 1000, h = 200, pad = { l: 36, r: 12, t: 12, b: 36 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const maxV = Math.max(1, ...data.map(d => Math.max(d.sessions, d.messages)));
  const slotW = innerW / data.length;
  const barW = Math.max(2, slotW * 0.35);
  const yScale = (v: number) => (v / maxV) * innerH;

  // x-Label-Schritt: max 10 Labels
  const labelEvery = Math.max(1, Math.ceil(data.length / 10));

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const y = pad.t + innerH * (1 - p);
          return (
            <g key={i}>
              <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="#d6d3d1" strokeWidth={p === 0 ? 1 : 0.5} />
              <text x={pad.l - 6} y={y + 3} fontSize="10" fill="#78716c" textAnchor="end">{Math.round(maxV * p)}</text>
            </g>
          );
        })}
        {/* bars */}
        {data.map((d, i) => {
          const x = pad.l + i * slotW + slotW / 2;
          const ySess = pad.t + innerH - yScale(d.sessions);
          const yMsg = pad.t + innerH - yScale(d.messages);
          return (
            <g key={i}>
              <rect x={x - barW - 0.5} y={ySess} width={barW} height={yScale(d.sessions)} fill="#BE123C" rx="1.5">
                <title>{d.day}: {d.sessions} Sessions, {d.messages} Messages</title>
              </rect>
              <rect x={x + 0.5} y={yMsg} width={barW} height={yScale(d.messages)} fill="#5FA28F" rx="1.5">
                <title>{d.day}: {d.sessions} Sessions, {d.messages} Messages</title>
              </rect>
            </g>
          );
        })}
        {/* x-axis labels */}
        {data.map((d, i) => {
          if (i % labelEvery !== 0 && i !== data.length - 1) return null;
          const x = pad.l + i * slotW + slotW / 2;
          return (
            <text key={i} x={x} y={h - 18} fontSize="10" fill="#78716c" textAnchor="middle">
              {d.day.slice(5)}
            </text>
          );
        })}
      </svg>
      <div className="flex gap-4 mt-1 text-xs text-stone-600">
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: "#BE123C" }} /> Sessions</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: "#5FA28F" }} /> User-Messages</span>
      </div>
    </div>
  );
}

function HourChart({ data }: { data: Array<{ hour: number; user_msgs: number; sessions_started: number }> }) {
  if (!data || data.length === 0) return <div className="text-sm text-stone-500">Keine Daten.</div>;
  const w = 600, h = 180, pad = { l: 28, r: 8, t: 10, b: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const maxV = Math.max(1, ...data.map(d => d.user_msgs));
  const slotW = innerW / data.length;
  const barW = slotW * 0.7;
  const yScale = (v: number) => (v / maxV) * innerH;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {[0, 0.5, 1].map((p, i) => {
          const y = pad.t + innerH * (1 - p);
          return (
            <g key={i}>
              <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="#d6d3d1" strokeWidth={p === 0 ? 1 : 0.4} />
              <text x={pad.l - 6} y={y + 3} fontSize="9" fill="#78716c" textAnchor="end">{Math.round(maxV * p)}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = pad.l + i * slotW + (slotW - barW) / 2;
          const y = pad.t + innerH - yScale(d.user_msgs);
          return (
            <rect key={i} x={x} y={y} width={barW} height={yScale(d.user_msgs)} fill="#7C2D12" rx="1.5">
              <title>{`${String(d.hour).padStart(2, "0")}:00 Uhr -- ${d.user_msgs} Messages, ${d.sessions_started} Sessions gestartet`}</title>
            </rect>
          );
        })}
        {data.map((d, i) => {
          if (d.hour % 3 !== 0) return null;
          const x = pad.l + i * slotW + slotW / 2;
          return (
            <text key={i} x={x} y={h - 12} fontSize="9" fill="#78716c" textAnchor="middle">
              {String(d.hour).padStart(2, "0")}
            </text>
          );
        })}
      </svg>
      <div className="text-xs text-stone-500 mt-1">User-Messages nach Tagesstunde (lokale Server-Zeit)</div>
    </div>
  );
}

function FileCatList({ rows }: { rows: Array<{ category: string; cnt: number; bytes_total: string }> }) {
  if (!rows || rows.length === 0) return <div className="text-sm text-stone-500">Keine Dateien im Zeitraum.</div>;
  const total = rows.reduce((sum, r) => sum + r.cnt, 0);
  const LABELS: Record<string, string> = { briefing: "Briefing", persona: "Persona-Daten", panel: "Panel-Review" };
  const COLORS: Record<string, string> = { briefing: "#A16207", persona: "#1F5F3C", panel: "#C2410C" };
  return (
    <div className="space-y-2.5">
      {rows.map(r => {
        const pctRow = total > 0 ? Math.round((r.cnt / total) * 100) : 0;
        const bytes = Number(r.bytes_total);
        return (
          <div key={r.category}>
            <div className="flex items-baseline justify-between text-sm mb-1">
              <span className="font-medium text-stone-900">{LABELS[r.category] ?? r.category}</span>
              <span className="text-stone-600 text-xs">{r.cnt} Files · {formatBytes(bytes)} · {pctRow}%</span>
            </div>
            <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pctRow}%`, background: COLORS[r.category] ?? "#888" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

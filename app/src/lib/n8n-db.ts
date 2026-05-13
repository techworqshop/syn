// Read-only Client für die n8n Postgres-DB, damit wir Token-Counts +
// Workflow-Telemetrie für Analytics ziehen koennen. Wird lazy gebootet.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getClient() {
  if (_client) return _client;
  const url = process.env.N8N_DATABASE_URL;
  if (!url) throw new Error("N8N_DATABASE_URL is not set");
  _client = postgres(url, { max: 4, idle_timeout: 30, prepare: false });
  return _client;
}

export function getN8nDb() {
  if (_db) return _db;
  _db = drizzle(getClient());
  return _db;
}

export const n8nDb = new Proxy({} as ReturnType<typeof getN8nDb>, {
  get: (_t, prop) => Reflect.get(getN8nDb(), prop)
});

/**
 * Token-Summen pro SessionId aus n8n executions, optional Range-Filter.
 * Sucht in workflowData (Snapshot der Execution) + data nach dem sessionId
 * UND nach Anthropic-Usage-Blocks (`input_tokens` + `output_tokens`).
 * Liefert ein Map<sessionId, { input, output }>.
 */
export async function fetchTokenUsageBySession(opts: {
  sinceISO: string | null;
  sessionIds?: string[]; // wenn gesetzt: nur diese; sonst alle
}): Promise<Map<string, { input: number; output: number; calls: number }>> {
  const since = opts.sinceISO;
  const sessionFilter = opts.sessionIds && opts.sessionIds.length
    ? `AND (${opts.sessionIds.map(id => `wd LIKE '%${id}%'`).join(" OR ")})`
    : "";

  // Wir lesen executions im Bereich, suchen pro Execution den sessionId
  // UND die input_tokens/output_tokens via regex. Dann gruppieren wir in JS.
  const sql = `
    SELECT
      ed.data AS d,
      ed."workflowData"::text AS wd,
      e."startedAt"
    FROM execution_data ed
    JOIN execution_entity e ON e.id = ed."executionId"
    WHERE e."startedAt" ${since ? `>= '${since}'::timestamptz` : `> '1970-01-01'::timestamptz`}
      AND (ed.data LIKE '%input_tokens%' OR ed.data LIKE '%output_tokens%')
      ${sessionFilter}
  `;

  type Row = { d: string; wd: string; startedAt: Date };
  const client = getClient();
  const rows = await client.unsafe<Row[]>(sql);

  const out = new Map<string, { input: number; output: number; calls: number }>();
  const sessionIdRe = /sessionId["\\:]+\s*["]?([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/;
  const inRe = /"input_tokens"\s*:\s*(\d+)/g;
  const outRe = /"output_tokens"\s*:\s*(\d+)/g;

  for (const r of rows) {
    const haystack = (r.d || "") + (r.wd || "");
    const idMatch = haystack.match(sessionIdRe);
    if (!idMatch) continue;
    const sid = idMatch[1];

    let inSum = 0;
    let outSum = 0;
    let calls = 0;
    let m: RegExpExecArray | null;
    inRe.lastIndex = 0;
    while ((m = inRe.exec(haystack))) { inSum += parseInt(m[1]); calls++; }
    outRe.lastIndex = 0;
    while ((m = outRe.exec(haystack))) outSum += parseInt(m[1]);

    const existing = out.get(sid) ?? { input: 0, output: 0, calls: 0 };
    existing.input  += inSum;
    existing.output += outSum;
    existing.calls  += calls;
    out.set(sid, existing);
  }
  return out;
}

/**
 * Totals across all sessions in range.
 */
export async function fetchTokenTotals(sinceISO: string | null): Promise<{
  input: number;
  output: number;
  total: number;
  calls: number;
  executions: number;
}> {
  const since = sinceISO;
  const sql = `
    SELECT ed.data AS d, ed."workflowData"::text AS wd
    FROM execution_data ed
    JOIN execution_entity e ON e.id = ed."executionId"
    WHERE e."startedAt" ${since ? `>= '${since}'::timestamptz` : `> '1970-01-01'::timestamptz`}
      AND (ed.data LIKE '%input_tokens%' OR ed.data LIKE '%output_tokens%')
  `;
  type Row = { d: string; wd: string };
  const client = getClient();
  const rows = await client.unsafe<Row[]>(sql);

  let input = 0;
  let output = 0;
  let calls = 0;
  const inRe = /"input_tokens"\s*:\s*(\d+)/g;
  const outRe = /"output_tokens"\s*:\s*(\d+)/g;
  for (const r of rows) {
    const hay = (r.d || "") + (r.wd || "");
    let m: RegExpExecArray | null;
    inRe.lastIndex = 0;
    while ((m = inRe.exec(hay))) { input += parseInt(m[1]); calls++; }
    outRe.lastIndex = 0;
    while ((m = outRe.exec(hay))) output += parseInt(m[1]);
  }
  return { input, output, total: input + output, calls, executions: rows.length };
}

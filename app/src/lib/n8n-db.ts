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
 * Per-Million-Token Preise in USD (Stand Q1 2026). Pattern-Match auf das
 * Modell-Family-Suffix, damit neue Modell-Versionen nicht jeden Patch
 * brauchen. Unbekannte Modelle landen im "unknown" Bucket, cost = 0.
 */
const PRICE_PER_MTOK_USD: Array<{ match: RegExp; family: string; in: number; out: number }> = [
  // Anthropic
  { match: /claude-opus-4-?[567]/i,       family: "Claude Opus 4.x",   in: 15.0, out: 75.0 },
  { match: /claude-sonnet-4-?[567]/i,     family: "Claude Sonnet 4.x", in:  3.0, out: 15.0 },
  { match: /claude-haiku-4-?[567]/i,      family: "Claude Haiku 4.x",  in:  0.80, out: 4.0 },
  { match: /claude-3-?5-sonnet/i,         family: "Claude 3.5 Sonnet", in:  3.0, out: 15.0 },
  { match: /claude-3-?5-haiku/i,          family: "Claude 3.5 Haiku",  in:  0.80, out: 4.0 },
  { match: /claude-3-?opus/i,             family: "Claude 3 Opus",     in: 15.0, out: 75.0 },
  // Google Gemini
  { match: /gemini-3(\.\d+)?-pro/i,       family: "Gemini 3.x Pro",    in:  1.25, out: 10.0 },
  { match: /gemini-3(\.\d+)?-flash/i,     family: "Gemini 3.x Flash",  in:  0.15, out:  0.60 },
  { match: /gemini-2(\.\d+)?-pro/i,       family: "Gemini 2.x Pro",    in:  1.25, out:  5.0 },
  { match: /gemini-2(\.\d+)?-flash/i,     family: "Gemini 2.x Flash",  in:  0.075, out: 0.30 }
];

function priceFor(model: string): { family: string; in: number; out: number } {
  for (const row of PRICE_PER_MTOK_USD) {
    if (row.match.test(model)) return row;
  }
  return { family: "unknown", in: 0, out: 0 };
}

/**
 * Totals across all sessions in range — total + per-model breakdown
 * mit Kostenschaetzung in USD.
 */
export async function fetchTokenTotals(sinceISO: string | null): Promise<{
  input: number;
  output: number;
  total: number;
  calls: number;
  executions: number;
  costUsd: number;
  byModel: Array<{ family: string; raw_model: string; input: number; output: number; calls: number; cost_usd: number }>;
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
  let costUsd = 0;

  // raw_model -> { input, output, calls }
  const byModelRaw = new Map<string, { input: number; output: number; calls: number }>();

  // Wir gehen jeden "usage" Block einzeln durch und ordnen ihn dem davorstehenden Modell zu.
  // Anthropic-Response-Shape: ..."model":"claude-...","usage":{"input_tokens":X,"output_tokens":Y}...
  // Gemini ist anders strukturiert; greift unsere Fallback-Heuristik (nearest preceding model).
  const usageRe = /"input_tokens"\s*:\s*(\d+)[^}]*?"output_tokens"\s*:\s*(\d+)/g;
  const modelRe = /"model"\s*:\s*"([^"]+)"/g;

  for (const r of rows) {
    const hay = (r.d || "") + "\n" + (r.wd || "");

    // Sammle alle Modell-Positionen
    const models: Array<{ pos: number; name: string }> = [];
    let mm: RegExpExecArray | null;
    modelRe.lastIndex = 0;
    while ((mm = modelRe.exec(hay))) {
      models.push({ pos: mm.index, name: mm[1] });
    }

    // Fuer jeden usage-Block: finde nearest preceding model
    let um: RegExpExecArray | null;
    usageRe.lastIndex = 0;
    while ((um = usageRe.exec(hay))) {
      const inTok = parseInt(um[1]);
      const outTok = parseInt(um[2]);
      const usagePos = um.index;
      let model = "unknown";
      for (let i = models.length - 1; i >= 0; i--) {
        if (models[i].pos < usagePos) { model = models[i].name; break; }
      }
      input += inTok;
      output += outTok;
      calls++;
      const existing = byModelRaw.get(model) ?? { input: 0, output: 0, calls: 0 };
      existing.input += inTok;
      existing.output += outTok;
      existing.calls += 1;
      byModelRaw.set(model, existing);
    }
  }

  // Aggregiere pro Family (mehrere raw-Modelle koennen zu einer Family gehoeren)
  const families = new Map<string, { family: string; input: number; output: number; calls: number; cost_usd: number; samples: Set<string> }>();
  for (const [rawModel, agg] of byModelRaw.entries()) {
    const p = priceFor(rawModel);
    const cost = (agg.input / 1_000_000) * p.in + (agg.output / 1_000_000) * p.out;
    costUsd += cost;
    const key = p.family;
    const fam = families.get(key) ?? { family: p.family, input: 0, output: 0, calls: 0, cost_usd: 0, samples: new Set<string>() };
    fam.input += agg.input;
    fam.output += agg.output;
    fam.calls += agg.calls;
    fam.cost_usd += cost;
    fam.samples.add(rawModel);
    families.set(key, fam);
  }

  const byModel = Array.from(families.values())
    .sort((a, b) => b.cost_usd - a.cost_usd)
    .map(f => ({
      family: f.family,
      raw_model: Array.from(f.samples).join(", "),
      input: f.input,
      output: f.output,
      calls: f.calls,
      cost_usd: f.cost_usd
    }));

  return { input, output, total: input + output, calls, executions: rows.length, costUsd, byModel };
}

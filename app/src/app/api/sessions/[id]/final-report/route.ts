import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publish } from "@/lib/redis";
import { sessions, messages } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { readState } from "@/lib/n8n";
import { and, eq, asc } from "drizzle-orm";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

type P = { params: Promise<{ id: string }> };

const REPORT_HOOK = process.env.SYNWEB_FINAL_REPORT_WEBHOOK
  || "https://n8n.worqshop.io/webhook/synweb/final-report";

function rigidityLabel(r?: number): string {
  const v = typeof r === "number" ? r : 5;
  if (v <= 3) return "standhaft";
  if (v <= 6) return "ausgewogen";
  return "offen";
}

type Persona = {
  name?: string; type?: string; core_perspective?: string; profile?: string;
  slack_slot?: number; rigidity?: number;
};
type Synth = { round_number: number; synthesis_text: string };
type Msg = { role: string; personaName?: string | null; content: string; roundNumber?: number | null; createdAt: Date | string };

function composeContext(personas: Persona[], syntheses: Synth[], msgs: Msg[]) {
  const personasContext = personas
    .sort((a, b) => (a.slack_slot || 0) - (b.slack_slot || 0))
    .map(p => {
      const rl = rigidityLabel(p.rigidity);
      const typ = p.type && p.type.toLowerCase() !== "human" ? p.type : "";
      return `- ${p.name || "Persona"}${typ ? ", " + typ : ""} (Haltung: ${rl}, Rigidity ${p.rigidity ?? 5}/10)
  Perspektive: ${p.core_perspective || "-"}
  Profil: ${(p.profile || "").slice(0, 300)}`;
    }).join("\n");

  const synthesesContext = syntheses
    .sort((a, b) => a.round_number - b.round_number)
    .map(s => `=== Runde ${s.round_number} ===\n${s.synthesis_text}`)
    .join("\n\n");

  const relevantMsgs = msgs
    .filter(m => m.role === "persona" || m.role === "user")
    .slice(-40)
    .map(m => {
      const who = m.role === "user" ? "User" : (m.personaName || "Persona");
      const round = m.roundNumber ? ` [R${m.roundNumber}]` : "";
      return `${who}${round}: ${(m.content || "").slice(0, 600)}`;
    }).join("\n\n");

  return { personasContext, synthesesContext, messagesContext: relevantMsgs };
}

const inFlight = new Set<string>();

export async function POST(_: Request, { params }: P) {
  const u = await requireUser();
  const { id } = await params;
  const [sess] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id))).limit(1);
  if (!sess) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (inFlight.has(id)) {
    return NextResponse.json({ error: "already generating" }, { status: 429 });
  }
  inFlight.add(id);
  setTimeout(() => inFlight.delete(id), 600000);

  // Status message — visible immediately in chat
  const [statusRow] = await db.insert(messages).values({
    sessionId: id, role: "coordinator",
    content: "⏳ Abschlussbericht wird erstellt... Das kann ein paar Minuten dauern. Du kannst das Fenster ruhig schliessen - der Bericht landet hier im Chat sobald er fertig ist.",
    metadata: { kind: "report_status" }
  }).returning();
  await publish(`session:${id}`, { type: "message", message: statusRow });

  const [state, msgs] = await Promise.all([
    readState(id).catch(() => ({ personas: [] as Persona[], syntheses: [] as Synth[] })),
    db.select().from(messages).where(eq(messages.sessionId, id)).orderBy(asc(messages.createdAt))
  ]);
  const ctx = composeContext(state.personas, state.syntheses, msgs as Msg[]);

  // Fire-and-forget: n8n workflow will POST back to /api/n8n/callback when done.
  fetch(REPORT_HOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: id,
      title: sess.title,
      createdAt: sess.createdAt,
      problemBrief: sess.problemBrief,
      personasContext: ctx.personasContext,
      synthesesContext: ctx.synthesesContext,
      messagesContext: ctx.messagesContext,
      filesContext: ""
    })
  }).catch(async (e) => {
    // If we cannot even start the workflow, surface it.
    const [errRow] = await db.insert(messages).values({
      sessionId: id, role: "coordinator",
      content: `⚠️ Abschlussbericht konnte nicht gestartet werden: ${e instanceof Error ? e.message : "unknown"}`,
      metadata: { kind: "error" }
    }).returning();
    await publish(`session:${id}`, { type: "message", message: errRow });
    inFlight.delete(id);
  });

  return NextResponse.json({ ok: true });
}

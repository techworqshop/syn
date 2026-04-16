import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages, audienceMessages, sessions } from "@/db/schema";
import { publish } from "@/lib/redis";
import { eq } from "drizzle-orm";

const SECRET = process.env.N8N_CALLBACK_SECRET!;

type Body = {
  sessionId: string;
  kind: string;
  text: string;
  personaId?: number | string;
  roundNumber?: number;
};

export async function POST(req: Request) {
  const hdr = req.headers.get("x-syn-callback-secret");
  if (!SECRET || hdr !== SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let b: Body;
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  if (!b.sessionId || !b.kind) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const [sess] = await db.select().from(sessions).where(eq(sessions.id, b.sessionId)).limit(1);
  if (!sess) return NextResponse.json({ error: "session not found" }, { status: 404 });

  const text = b.text || "";
  if (b.kind === "audience_reply" || b.kind === "audience_no_persona") {
    const slot = typeof b.personaId === "string" ? parseInt(b.personaId) : (b.personaId ?? 0);
    const [row] = await db.insert(audienceMessages).values({
      sessionId: b.sessionId, personaSlot: slot, role: "persona", content: text
    }).returning();
    await publish(`session:${b.sessionId}:audience:${slot}`,
      { type: "audience_message", message: row });
    return NextResponse.json({ ok: true });
  }

  let role = "system";
  let personaSlot: number | null = null;
  let personaName: string | null = null;
  if (b.kind === "coordinator") role = "coordinator";
  else if (b.kind === "synthesis") role = "synthesis";
  else if (b.kind === "persona_round") {
    role = "persona";
    const pid = typeof b.personaId === "string" ? b.personaId : String(b.personaId);
    const map: Record<string, number> = { alpha: 1, beta: 2, gamma: 3, sigma: 4, omega: 5 };
    personaSlot = map[pid.toLowerCase()] ?? null;
    personaName = pid;
  }

  const [row] = await db.insert(messages).values({
    sessionId: b.sessionId,
    role,
    personaSlot,
    personaName,
    content: text,
    roundNumber: b.roundNumber ?? null,
    metadata: { kind: b.kind }
  }).returning();
  await publish(`session:${b.sessionId}`, { type: "message", message: row });
  return NextResponse.json({ ok: true });
}

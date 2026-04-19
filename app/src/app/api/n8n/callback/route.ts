import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages, audienceMessages, sessions } from "@/db/schema";
import { publish } from "@/lib/redis";
import { readState } from "@/lib/n8n";
import { suggestTitle } from "@/lib/title-gen";
import { generatePersonaImage } from "@/lib/persona-image-gen";
import { personaImages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

const SECRET = process.env.N8N_CALLBACK_SECRET!;

type Body = {
  sessionId: string;
  kind: string;
  text: string;
  personaId?: number | string;
  roundNumber?: number;
};

type SessionRow = typeof sessions.$inferSelect;

async function syncPanelAndImages(sessionId: string, sess: SessionRow) {
  const state = await readState(sessionId);
  const personaCount = state.personas.length;
  const derivedRound = Math.max(
    0,
    ...state.syntheses.map(s => s.round_number || 0),
    ...state.personas.flatMap(p => [
      p.round_1_response ? 1 : 0,
      p.round_2_response ? 2 : 0,
      p.round_3_response ? 3 : 0
    ])
  );
  if (personaCount !== sess.personaCount || derivedRound !== sess.currentRound) {
    await db.update(sessions).set({
      personaCount, currentRound: derivedRound, updatedAt: new Date()
    }).where(eq(sessions.id, sessionId));
    await publish(`session:${sessionId}`, {
      type: "session", personaCount, currentRound: derivedRound
    });
  } else if (personaCount > 0) {
    // even if counts didn't change, prompt sidebar to refetch (rigidity/content may have)
    await publish(`session:${sessionId}`, { type: "panel_refresh" });
  }

  const existingImgs = await db.select().from(personaImages)
    .where(eq(personaImages.sessionId, sessionId));
  const existingSlots = new Set(existingImgs.map(x => x.slot));
  for (const p of state.personas) {
    const slot = p.slack_slot;
    if (!slot || existingSlots.has(slot)) continue;
    generatePersonaImage({ sessionId, slot, name: p.name || "", type: p.type, profile: p.profile })
      .then(() => publish(`session:${sessionId}`, { type: "persona_image", slot }).catch(()=>{}))
      .catch(()=>{});
  }
}

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

  if (b.kind === "status") {
    // Ephemeral progress indicator - broadcast but don't persist
    await publish(`session:${b.sessionId}`, { type: "status", text });
    // Opportunistic: while the agent is working, personas may be getting saved
    // progressively - kick off image-gen for any that exist but have no image yet,
    // and signal the sidebar to refetch so new tiles pop in.
    syncPanelAndImages(b.sessionId, sess).catch(()=>{});
    return NextResponse.json({ ok: true });
  }

  if (b.kind === "error") {
    const content = text.trim() || "⚠️ Da ist was schiefgelaufen. Probier's bitte nochmal.";
    const [row] = await db.insert(messages).values({
      sessionId: b.sessionId,
      role: "coordinator",
      content,
      metadata: { kind: "error" }
    }).returning();
    await publish(`session:${b.sessionId}`, { type: "message", message: row });
    return NextResponse.json({ ok: true });
  }

  let role = "system";
  let personaSlot: number | null = null;
  let personaName: string | null = null;
  if (b.kind === "coordinator") role = "coordinator";
  else if (b.kind === "synthesis") role = "synthesis";
  else if (b.kind === "persona_round") {
    role = "persona";
    const pid = String(b.personaId || "").toLowerCase();
    try {
      const state = await readState(b.sessionId);
      const p = state.personas.find(
        (x) => (x.persona_id || "").toLowerCase() === pid ||
               (x.name || "").toLowerCase() === pid
      );
      if (p) { personaSlot = p.slack_slot ?? null; personaName = p.name ?? pid; }
    } catch {}
    if (!personaSlot) {
      const map: Record<string, number> = { alpha: 1, beta: 2, gamma: 3, sigma: 4, omega: 5 };
      personaSlot = map[pid] ?? null;
    }
    if (!personaName) personaName = pid;
  }

  // skip empty messages
  if (!text.trim()) return NextResponse.json({ ok: true, skipped: true });

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

  if (role === "coordinator" && !sess.titleLocked && (sess.title === "Neue Fokusgruppe" || !sess.title)) {
    const allMsgs = await db.select().from(messages)
      .where(eq(messages.sessionId, b.sessionId)).orderBy(asc(messages.createdAt));
    const firstUserMsgs = allMsgs.filter(m => m.role === "user").map(m => m.content).slice(0, 3);
    if (firstUserMsgs.length >= 1) {
      const suggestion = await suggestTitle(null, firstUserMsgs);
      if (suggestion && suggestion.length >= 4) {
        await db.update(sessions).set({ title: suggestion, updatedAt: new Date() })
          .where(eq(sessions.id, b.sessionId));
        await publish(`session:${b.sessionId}`, { type: "session", title: suggestion });
      }
    }
  }
  if (role === "coordinator" || role === "persona" || role === "synthesis") {
    syncPanelAndImages(b.sessionId, sess).catch(()=>{});
  }
  return NextResponse.json({ ok: true });
}


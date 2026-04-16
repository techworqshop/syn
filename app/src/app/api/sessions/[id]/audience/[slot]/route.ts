import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, audienceMessages } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { forwardToGateway } from "@/lib/n8n";
import { publish } from "@/lib/redis";
import { and, eq, asc } from "drizzle-orm";

type P = { params: Promise<{ id: string; slot: string }> };

export async function GET(_: Request, { params }: P) {
  const u = await requireUser();
  const { id, slot } = await params;
  const slotNum = parseInt(slot);
  const [sess] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id))).limit(1);
  if (!sess) return NextResponse.json({ error: "not found" }, { status: 404 });
  const rows = await db.select().from(audienceMessages)
    .where(and(eq(audienceMessages.sessionId, id),
               eq(audienceMessages.personaSlot, slotNum)))
    .orderBy(asc(audienceMessages.createdAt));
  return NextResponse.json({ messages: rows });
}

export async function POST(req: Request, { params }: P) {
  const u = await requireUser();
  const { id, slot } = await params;
  const slotNum = parseInt(slot);
  const { text } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }
  const [sess] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id))).limit(1);
  if (!sess) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [userMsg] = await db.insert(audienceMessages).values({
    sessionId: id, personaSlot: slotNum, role: "user", content: text
  }).returning();
  await publish(`session:${id}:audience:${slotNum}`,
    { type: "audience_message", message: userMsg });
  try {
    await forwardToGateway({
      sessionId: id, userId: u.id,
      cleanMessage: text, targetPersona: slotNum
    });
  } catch (e) {
    const err = e instanceof Error ? e.message : "unknown";
    await db.insert(audienceMessages).values({
      sessionId: id, personaSlot: slotNum, role: "system",
      content: `Gateway-Fehler: ${err}`
    });
  }
  return NextResponse.json({ ok: true, messageId: userMsg.id });
}

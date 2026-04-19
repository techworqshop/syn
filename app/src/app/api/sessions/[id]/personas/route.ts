import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, personaImages } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { readState } from "@/lib/n8n";
import { and, eq } from "drizzle-orm";

type P = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: P) {
  const u = await requireUser();
  const { id } = await params;
  const [sess] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id))).limit(1);
  if (!sess) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const [state, images] = await Promise.all([
      readState(id),
      db.select().from(personaImages).where(eq(personaImages.sessionId, id))
    ]);
    const readySlots = new Set(
      images.filter(i => i.status === "ready").map(i => i.slot)
    );
    const personas = state.personas.map(p => ({
      ...p,
      imageReady: p.slack_slot != null && readySlots.has(p.slack_slot)
    }));
    return NextResponse.json({ personas, syntheses: state.syntheses });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { error: msg, personas: [], syntheses: [] },
      { status: 200 }
    );
  }
}

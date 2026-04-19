import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { and, eq } from "drizzle-orm";

type P = { params: Promise<{ id: string; slot: string }> };

const UPDATE_HOOK = process.env.SYNWEB_UPDATE_PERSONA_WEBHOOK
  || "https://n8n.worqshop.io/webhook/synweb/update-persona";

export async function PATCH(req: Request, { params }: P) {
  const u = await requireUser();
  const { id, slot } = await params;
  const slotNum = parseInt(slot);
  if (isNaN(slotNum) || slotNum < 1 || slotNum > 5) {
    return NextResponse.json({ error: "invalid slot" }, { status: 400 });
  }
  const [sess] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id))).limit(1);
  if (!sess) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const rigidity = typeof body.rigidity === "number" ? body.rigidity : NaN;
  if (isNaN(rigidity) || rigidity < 0 || rigidity > 10) {
    return NextResponse.json({ error: "invalid rigidity" }, { status: 400 });
  }

  const res = await fetch(UPDATE_HOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: id, slot: slotNum, rigidity })
  });
  if (!res.ok) {
    return NextResponse.json({ error: "update failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, slot: slotNum, rigidity });
}

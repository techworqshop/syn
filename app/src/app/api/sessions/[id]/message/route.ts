import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, messages, files } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { forwardToGateway, ingestFile } from "@/lib/n8n";
import { publish } from "@/lib/redis";
import { and, eq } from "drizzle-orm";

export const maxDuration = 300;

type P = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: P) {
  const u = await requireUser();
  const { id } = await params;
  const { text } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }
  const [sess] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id))).limit(1);
  if (!sess) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [userMsg] = await db.insert(messages).values({
    sessionId: id, role: "user", content: text
  }).returning();
  await publish(`session:${id}`, { type: "message", message: userMsg });

  const sessionFiles = await db.select().from(files).where(eq(files.sessionId, id));
  const hasFiles = sessionFiles.length > 0;
  const PUBLIC_BASE = process.env.PUBLIC_BASE_URL || "https://syn.worqshop.io";
  const pendingFiles = sessionFiles.filter(f => !f.summary);

  if (pendingFiles.length > 0) {
    const noun = pendingFiles.length === 1 ? "Datei" : "Dateien";
    await publish(`session:${id}`, { type: "status", text: `Analysiere ${pendingFiles.length} ${noun} ...` });
    await Promise.all(pendingFiles.map(async (f) => {
      await db.update(files).set({ summary: "[wird analysiert]" }).where(eq(files.id, f.id));
      try {
        await ingestFile({
          sessionId: id, fileId: f.id, fileName: f.fileName,
          mimeType: f.mimeType, fileUrl: `${PUBLIC_BASE}/api/files/${f.id}`, uploadOrder: 1
        });
        await db.update(files).set({ summary: "[analysiert]" }).where(eq(files.id, f.id));
      } catch {}
    }));
    await publish(`session:${id}`, { type: "status", text: "Dateien fertig analysiert. Coordinator startet ..." });
  }

  try {
    await forwardToGateway({
      sessionId: id, userId: u.id, cleanMessage: text, hasFiles
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "unknown error";
    await db.insert(messages).values({
      sessionId: id, role: "system", content: `Gateway-Fehler: ${errMsg}`
    });
  }
  return NextResponse.json({ ok: true, messageId: userMsg.id });
}

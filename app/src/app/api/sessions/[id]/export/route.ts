import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, messages, audienceMessages, files } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { readState } from "@/lib/n8n";
import { and, eq, asc } from "drizzle-orm";

type P = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: P) {
  const u = await requireUser();
  const { id } = await params;
  const [sess] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id))).limit(1);
  if (!sess) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [msgs, aud, fs, state] = await Promise.all([
    db.select().from(messages).where(eq(messages.sessionId, id)).orderBy(asc(messages.createdAt)),
    db.select().from(audienceMessages).where(eq(audienceMessages.sessionId, id)).orderBy(asc(audienceMessages.createdAt)),
    db.select().from(files).where(eq(files.sessionId, id)).orderBy(asc(files.createdAt)),
    readState(id).catch(() => ({ personas: [], syntheses: [] }))
  ]);
  const body = {
    exportedAt: new Date().toISOString(),
    session: sess,
    personas: state.personas,
    syntheses: state.syntheses,
    messages: msgs,
    audienceMessages: aud,
    files: fs.map(f => ({ ...f, storagePath: undefined }))
  };
  const filename = `synweb-${sess.id}-${new Date().toISOString().slice(0,10)}.json`;
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, messages, files } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { readState } from "@/lib/n8n";
import { and, eq, asc } from "drizzle-orm";
import { buildTranscriptMarkdown } from "@/lib/transcript";
import { getLocaleFromCookies } from "@/lib/i18n";

type P = { params: Promise<{ id: string }> };
type Persona = { name?: string; type?: string; core_perspective?: string; profile?: string; slack_slot?: number; rigidity?: number };

export async function GET(_: Request, { params }: P) {
  const u = await requireUser();
  const { id } = await params;
  const [sess] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id))).limit(1);
  if (!sess) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [msgs, sessionFiles, stateRaw, locale] = await Promise.all([
    db.select().from(messages).where(eq(messages.sessionId, id)).orderBy(asc(messages.createdAt)),
    db.select().from(files).where(eq(files.sessionId, id)).orderBy(asc(files.createdAt)),
    readState(id).catch(() => ({ personas: [], syntheses: [] })),
    getLocaleFromCookies()
  ]);
  const state = stateRaw as { personas: Persona[]; syntheses: Array<{ round_number: number; synthesis_text: string }> };

  const body = buildTranscriptMarkdown({
    session: sess,
    messages: msgs,
    files: sessionFiles,
    state,
    locale
  });
  const safeName = sess.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="syn-${safeName}.md"`
    }
  });
}

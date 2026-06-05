import { db } from "@/lib/db";
import { sessions, messages } from "@/db/schema";
import { readState } from "@/lib/n8n";
import { eq, asc } from "drizzle-orm";
import { buildPDF } from "@/lib/session-pdf";
import { getLocaleFromCookies } from "@/lib/i18n";

type P = { params: Promise<{ token: string }> };

export async function GET(_: Request, { params }: P) {
  const { token } = await params;
  const [sess] = await db.select().from(sessions)
    .where(eq(sessions.shareToken, token)).limit(1);
  if (!sess) return new Response("not found", { status: 404 });

  const [msgs, state, locale] = await Promise.all([
    db.select().from(messages).where(eq(messages.sessionId, sess.id)).orderBy(asc(messages.createdAt)),
    readState(sess.id).catch(() => ({ personas: [], syntheses: [] })),
    getLocaleFromCookies()
  ]);

  const pdf = await buildPDF({
    session: { title: sess.title, currentRound: sess.currentRound, problemBrief: sess.problemBrief, createdAt: sess.createdAt },
    personas: state.personas,
    syntheses: state.syntheses,
    messages: msgs,
    locale
  });
  const safeName = sess.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="syn-${safeName}.pdf"`
    }
  });
}

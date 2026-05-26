import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions, messages, files } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { forwardToGateway, ingestFile } from "@/lib/n8n";
import { publish } from "@/lib/redis";
import { and, eq } from "drizzle-orm";
import { getLocaleFromCookies } from "@/lib/i18n";
import { consumeSlotOnFirstMessage, loadQuotaState } from "@/lib/quota";

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

  // Subscription-Gate: status=cancelled/paused/inactive ODER term abgelaufen -> blockiert
  const qsGate = await loadQuotaState(u.id);
  const termExpired = qsGate.periodEnd ? qsGate.periodEnd.getTime() < Date.now() : false;
  if (!qsGate.bypass && (!qsGate.hasActiveSub || termExpired)) {
    return NextResponse.json({ error: "subscription_inactive" }, { status: 402 });
  }

  // Sperre: nach Runde 3 oder nach Abschlussbericht keine neuen Haupt-Chat-Messages mehr
  const existing = await db.select().from(messages).where(eq(messages.sessionId, id));
  const hasReport = existing.some(m => {
    const md = (typeof m.metadata === "object" && m.metadata !== null ? m.metadata : {}) as { kind?: string };
    return md.kind === "report" || md.kind === "report_text";
  });
  if ((sess.currentRound ?? 0) >= 3 || hasReport) {
    return NextResponse.json({ error: "Fokusgruppe abgeschlossen. Generiere den Abschlussbericht ueber das 3-Punkte-Menue oder befrage einzelne Personas in der Sidebar." }, { status: 423 });
  }

  const [userMsg] = await db.insert(messages).values({
    sessionId: id, role: "user", content: text
  }).returning();
  await publish(`session:${id}`, { type: "message", message: userMsg });

  // File-Lock: sobald eine Nachricht abgeschickt wurde, sind die hochgeladenen
  // Files "submitted" und duerfen nicht mehr geloescht werden (Anti-Cheat:
  // kein Austauschen von Material nachdem die Diskussion laeuft). Idempotent.
  await db.update(files).set({ locked: true })
    .where(and(eq(files.sessionId, id), eq(files.locked, false)));

  // First-message-of-session triggers quota consumption. Idempotent (sees first_message_at).
  try {
    const qs = await loadQuotaState(u.id);
    if (!qs.bypass && qs.periodStart) {
      await consumeSlotOnFirstMessage({ userId: u.id, sessionId: id, periodStart: qs.periodStart });
    }
  } catch (e) {
    console.error("[message] quota consume failed (non-fatal):", e);
  }

  // Persist locale on session so n8n-callback can translate status texts.
  const lcEarly = await getLocaleFromCookies();
  if ((sess as { locale?: string }).locale !== lcEarly) {
    await db.update(sessions).set({ locale: lcEarly }).where(eq(sessions.id, id));
  }

  const sessionFiles = await db.select().from(files).where(eq(files.sessionId, id));
  const hasFiles = sessionFiles.length > 0;
  const PUBLIC_BASE = process.env.PUBLIC_BASE_URL || "https://syn.worqshop.io";
  const pendingFiles = sessionFiles.filter(f => !f.summary);

  const locale = lcEarly;
  if (pendingFiles.length > 0) {
    const noun = locale === "en"
      ? (pendingFiles.length === 1 ? "file" : "files")
      : (pendingFiles.length === 1 ? "Datei" : "Dateien");
    const analyzing = locale === "en"
      ? `Analysing ${pendingFiles.length} ${noun} ...`
      : `Analysiere ${pendingFiles.length} ${noun} ...`;
    await publish(`session:${id}`, { type: "status", text: analyzing });
    await Promise.all(pendingFiles.map(async (f) => {
      await db.update(files).set({ summary: "[wird analysiert]" }).where(eq(files.id, f.id));
      try {
        await ingestFile({
          sessionId: id, fileId: f.id, fileName: f.fileName,
          mimeType: f.mimeType, fileUrl: `${PUBLIC_BASE}/api/files/${f.id}`, uploadOrder: 1
        });
        await db.update(files).set({ summary: "[analysiert]" }).where(eq(files.id, f.id));
      } catch {
        await db.update(files).set({ summary: null }).where(eq(files.id, f.id));
      }
    }));
    await publish(`session:${id}`, { type: "status", text: locale === "en" ? "Files analysed. Syn is starting ..." : "Dateien fertig analysiert. Syn startet ..." });
  }

  // Initial reasoning status with variety so user does not always see the same
  // text. Save Panel / Run Round overwrite this once the Opus agent finishes
  // thinking and starts firing tools.
  if (pendingFiles.length === 0) {
    const pick = locale === "en" ? "Syn is thinking ..." : "Syn denkt ...";

    const trimmed = text.trim().toLowerCase();
    const confirmTokens = ["go","ok","ja","passt","weiter","los","jepp","yes","do it","yep"];
    const isConfirm = confirmTokens.includes(trimmed);
    let initialText = pick;
    if (isConfirm && sess.status === "setup" && (sess.personaCount ?? 0) === 0) {
      initialText = locale === "en" ? "Syn is saving panel ..." : "Syn speichert Panel ...";
    } else if (isConfirm && sess.status === "ready") {
      const nr = (sess.currentRound ?? 0) + 1;
      if (nr <= 3) initialText = locale === "en" ? `Syn starts round ${nr} ...` : `Syn startet Runde ${nr} ...`;
    }
    await publish(`session:${id}`, { type: "status", text: initialText });
  }
  try {
    await forwardToGateway({
      sessionId: id, userId: u.id, cleanMessage: text, hasFiles, locale
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "unknown error";
    await db.insert(messages).values({
      sessionId: id, role: "system", content: `Gateway-Fehler: ${errMsg}`
    });
  }
  return NextResponse.json({ ok: true, messageId: userMsg.id });
}

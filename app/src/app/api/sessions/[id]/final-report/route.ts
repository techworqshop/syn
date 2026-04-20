import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { publish } from "@/lib/redis";
import { sessions, messages } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { readState } from "@/lib/n8n";
import { and, eq, asc } from "drizzle-orm";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

type P = { params: Promise<{ id: string }> };

const REPORTS_DIR = "/app/uploads/reports";

const REPORT_HOOK = process.env.SYNWEB_FINAL_REPORT_WEBHOOK
  || "https://n8n.worqshop.io/webhook/synweb/final-report";

function rigidityLabel(r?: number): string {
  const v = typeof r === "number" ? r : 5;
  if (v <= 3) return "standhaft";
  if (v <= 6) return "ausgewogen";
  return "offen";
}

type Persona = {
  name?: string; type?: string; core_perspective?: string; profile?: string;
  slack_slot?: number; rigidity?: number;
};
type Synth = { round_number: number; synthesis_text: string };
type Msg = { role: string; personaName?: string | null; content: string; roundNumber?: number | null; createdAt: Date | string };

function composeContext(personas: Persona[], syntheses: Synth[], msgs: Msg[]) {
  const personasContext = personas
    .sort((a, b) => (a.slack_slot || 0) - (b.slack_slot || 0))
    .map(p => {
      const rl = rigidityLabel(p.rigidity);
      const typ = p.type && p.type.toLowerCase() !== "human" ? p.type : "";
      return `- ${p.name || "Persona"}${typ ? ", " + typ : ""} (Haltung: ${rl}, Rigidity ${p.rigidity ?? 5}/10)
  Perspektive: ${p.core_perspective || "-"}
  Profil: ${(p.profile || "").slice(0, 300)}`;
    }).join("\n");

  const synthesesContext = syntheses
    .sort((a, b) => a.round_number - b.round_number)
    .map(s => `=== Runde ${s.round_number} ===\n${s.synthesis_text}`)
    .join("\n\n");

  const relevantMsgs = msgs
    .filter(m => m.role === "persona" || m.role === "user")
    .slice(-40)
    .map(m => {
      const who = m.role === "user" ? "User" : (m.personaName || "Persona");
      const round = m.roundNumber ? ` [R${m.roundNumber}]` : "";
      return `${who}${round}: ${(m.content || "").slice(0, 600)}`;
    }).join("\n\n");

  return { personasContext, synthesesContext, messagesContext: relevantMsgs };
}

function renderPDF(
  title: string,
  meta: { createdAt: Date | string; personaCount: number; currentRound: number },
  personas: Persona[],
  reportMd: string
): Promise<Buffer> {
  return new Promise(resolve => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const chunks: Buffer[] = [];
    doc.on("data", c => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    // Cover
    doc.fontSize(10).fillColor("#716b7d").text("SynWeb - Abschlussbericht", { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(28).fillColor("#f4f1f7").text(title, { align: "left" });
    doc.moveDown(0.5);
    const created = new Date(meta.createdAt);
    doc.fontSize(10).fillColor("#716b7d")
      .text(`Erstellt: ${created.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}`);
    doc.text(`${meta.personaCount} Personas / ${meta.currentRound} Runden`);
    doc.text(`Export: ${new Date().toLocaleString("de-DE")}`);
    doc.moveDown(1.5);
    doc.moveTo(56, doc.y).lineTo(539, doc.y).strokeColor("#3f2a5a").lineWidth(1).stroke();
    doc.moveDown(1.2);

    // Body - parse markdown
    const lines = reportMd.split(/\r?\n/);
    let inList = false;
    for (const raw of lines) {
      const line = raw;
      if (/^#\s+/.test(line)) {
        if (inList) { inList = false; doc.moveDown(0.3); }
        doc.moveDown(0.6);
        doc.fontSize(20).fillColor("#d946ef").text(line.replace(/^#\s+/, ""));
        doc.moveDown(0.4);
      } else if (/^##\s+/.test(line)) {
        if (inList) { inList = false; doc.moveDown(0.3); }
        doc.moveDown(0.5);
        doc.fontSize(15).fillColor("#c084fc").text(line.replace(/^##\s+/, ""));
        doc.moveDown(0.3);
      } else if (/^###\s+/.test(line)) {
        if (inList) { inList = false; doc.moveDown(0.2); }
        doc.moveDown(0.3);
        doc.fontSize(12).fillColor("#fbbf24").text(line.replace(/^###\s+/, ""));
        doc.moveDown(0.2);
      } else if (/^\s*[-*]\s+/.test(line)) {
        inList = true;
        const text = line.replace(/^\s*[-*]\s+/, "");
        renderInlineBold(doc, text, { bullet: true });
      } else if (line.trim() === "") {
        if (inList) { inList = false; doc.moveDown(0.3); }
        doc.moveDown(0.3);
      } else {
        if (inList) { inList = false; doc.moveDown(0.2); }
        renderInlineBold(doc, line, { bullet: false });
      }
    }

    doc.end();
  });
}

function renderInlineBold(doc: InstanceType<typeof PDFDocument>, text: string, opts: { bullet: boolean }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  const indent = opts.bullet ? 16 : 0;
  if (opts.bullet) {
    doc.fontSize(11).fillColor("#c084fc").text("-", { continued: true, indent: 4 })
      .fillColor("#d4d1da").text(" ", { continued: true });
  }
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const isLast = i === parts.length - 1;
    const isBold = /^\*\*[^*]+\*\*$/.test(p);
    const clean = isBold ? p.replace(/^\*\*|\*\*$/g, "") : p;
    if (isBold) {
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#f4f1f7").text(clean, { continued: !isLast, indent: opts.bullet ? 0 : indent });
    } else {
      doc.font("Helvetica").fontSize(11).fillColor("#d4d1da").text(clean, { continued: !isLast, indent: opts.bullet ? 0 : indent });
    }
  }
  doc.font("Helvetica");
  if (opts.bullet) doc.moveDown(0.2);
  else doc.moveDown(0.4);
}

const inFlight = new Set<string>();


async function announce(sessionId: string, content: string, metadata: object = { kind: "report_status" }) {
  try {
    const [row] = await db.insert(messages).values({
      sessionId, role: "coordinator", content,
      metadata
    }).returning();
    await publish(`session:${sessionId}`, { type: "message", message: row });
  } catch {}
}

export async function POST(_: Request, { params }: P) {
  const u = await requireUser();
  const { id } = await params;
  const [sess] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id))).limit(1);
  if (!sess) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (inFlight.has(id)) {
    return NextResponse.json({ error: "already generating" }, { status: 429 });
  }
  inFlight.add(id);
  setTimeout(() => inFlight.delete(id), 300000);

  await announce(id, "\u23F3 Abschlussbericht wird erstellt... Das kann ein paar Minuten dauern. Du kannst weiterarbeiten - das PDF landet hier im Chat wenn er fertig ist.");

  const [state, msgs] = await Promise.all([
    readState(id).catch(() => ({ personas: [] as Persona[], syntheses: [] as Synth[] })),
    db.select().from(messages).where(eq(messages.sessionId, id)).orderBy(asc(messages.createdAt))
  ]);

  const ctx = composeContext(state.personas, state.syntheses, msgs as Msg[]);

  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 300000); const hookRes = await fetch(REPORT_HOOK, { signal: ctrl.signal,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: sess.title,
      createdAt: sess.createdAt,
      problemBrief: sess.problemBrief,
      personasContext: ctx.personasContext,
      synthesesContext: ctx.synthesesContext,
      messagesContext: ctx.messagesContext,
      filesContext: ""
    })
  });

  clearTimeout(to); if (!hookRes.ok) {
    return NextResponse.json({ error: "report generation failed" }, { status: 502 });
  }
  const payload = await hookRes.json().catch(() => ({ report: "" }));
  const reportMd: string = payload.report || "# Abschlussbericht\n\nReport konnte nicht generiert werden.";

  const pdf = await renderPDF(
    sess.title,
    { createdAt: sess.createdAt, personaCount: sess.personaCount, currentRound: sess.currentRound },
    state.personas,
    reportMd
  );


  const reportId = crypto.randomUUID();
  const dir = path.join(REPORTS_DIR, id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${reportId}.pdf`), pdf);
  const safeName = sess.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  const filename = `synweb-bericht-${safeName}.pdf`;

  await announce(id, "\u{1F4C4} Abschlussbericht", {
    kind: "report", reportId, filename,
    generatedAt: new Date().toISOString()
  });

  inFlight.delete(id);
  return NextResponse.json({ ok: true });
}

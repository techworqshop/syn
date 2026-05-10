import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { db } from "@/lib/db";
import { sessions, messages } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { readState } from "@/lib/n8n";
import { and, eq, asc } from "drizzle-orm";

type P = { params: Promise<{ id: string }> };

const SLOT_COLOR: Record<number, string> = {
  1: "#c2410c",
  2: "#b45309",
  3: "#4d7c0f",
  4: "#7c2d12",
  5: "#b91c1c"
};
const ROLE_COLOR: Record<string, string> = {
  user:        "#7c2d12",
  coordinator: "#9f1239",
  synthesis:   "#a16207",
  system:      "#52525b"
};
const ROLE_LABEL: Record<string, string> = {
  user: "Du",
  coordinator: "Syn",
  persona: "Persona",
  synthesis: "Synthese",
  system: "System"
};

const C_BODY  = "#292524";
const C_MUTED = "#57534e";
const C_FAINT = "#a8a29e";
const C_DIV   = "#a16207";

function labelFor(m: { role: string; personaName?: string | null; personaSlot?: number | null; roundNumber?: number | null }): string {
  if (m.role === "persona") return m.personaName || `Persona ${m.personaSlot ?? ""}`.trim();
  if (m.role === "synthesis") return `Synthese - Runde ${m.roundNumber ?? ""}`.trim();
  return ROLE_LABEL[m.role] || m.role;
}
function colorFor(m: { role: string; personaSlot?: number | null }): string {
  if (m.role === "persona" && m.personaSlot && SLOT_COLOR[m.personaSlot]) return SLOT_COLOR[m.personaSlot];
  return ROLE_COLOR[m.role] || C_MUTED;
}
function drawRule(doc: InstanceType<typeof PDFDocument>, color = C_DIV, weight = 0.6) {
  const x1 = doc.page.margins.left;
  const x2 = doc.page.width - doc.page.margins.right;
  doc.moveTo(x1, doc.y).lineTo(x2, doc.y).strokeColor(color).lineWidth(weight).stroke();
}
function sectionTitle(doc: InstanceType<typeof PDFDocument>, label: string, color = "#9f1239") {
  doc.font("Helvetica-Bold").fontSize(16).fillColor(color).text(label.toUpperCase(), { characterSpacing: 1.2 });
  doc.moveDown(0.2);
  drawRule(doc, "#a16207", 1);
  doc.moveDown(0.6);
}
function renderRichLine(doc: InstanceType<typeof PDFDocument>, line: string, opts: { fontSize: number; color: string; indent?: number; lineGap?: number }) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  if (!parts.length) return;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const isLast = i === parts.length - 1;
    const isBold = /^\*\*[^*]+\*\*$/.test(p);
    const clean = isBold ? p.replace(/^\*\*|\*\*$/g, "") : p;
    doc.font(isBold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(opts.fontSize).fillColor(opts.color)
      .text(clean, { continued: !isLast, indent: opts.indent ?? 0, lineGap: opts.lineGap ?? 1 });
  }
  doc.font("Helvetica");
}
function renderMarkdownBlock(doc: InstanceType<typeof PDFDocument>, text: string) {
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw;
    if (/^\s*---+\s*$/.test(line)) { doc.moveDown(0.3); continue; }
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      const txt = h[2];
      doc.moveDown(level === 1 ? 0.5 : 0.3);
      if (level === 1) {
        doc.font("Helvetica-Bold").fontSize(14).fillColor("#9f1239").text(txt);
      } else if (level === 2) {
        const isNumbered = /^\s*\d+\.\s/.test(txt);
        if (isNumbered) { doc.moveDown(0.3); drawRule(doc, "#a16207", 0.8); doc.moveDown(0.3); }
        doc.font("Helvetica-Bold").fontSize(12).fillColor("#7c2d12").text(txt);
      } else {
        doc.font("Helvetica-Bold").fontSize(11).fillColor("#4d7c0f").text(txt);
      }
      doc.moveDown(0.2);
      continue;
    }
    const b = line.match(/^\s*[-*]\s+(.+)$/);
    if (b) {
      doc.font("Helvetica").fontSize(10).fillColor("#a16207").text("-", { continued: true, indent: 8 });
      renderRichLine(doc, " " + b[1], { fontSize: 10, color: C_BODY });
      doc.moveDown(0.15);
      continue;
    }
    if (line.trim() === "") { doc.moveDown(0.4); continue; }
    renderRichLine(doc, line, { fontSize: 10.5, color: C_BODY, lineGap: 2 });
    doc.moveDown(0.2);
  }
}

function buildPDF(data: {
  session: { title: string; currentRound: number; problemBrief: string | null; createdAt: Date | string };
  personas: Array<{ name?: string; type?: string; core_perspective?: string; profile?: string; slack_slot?: number; rigidity?: number }>;
  syntheses: Array<{ round_number: number; synthesis_text: string }>;
  messages: Array<{ role: string; personaName?: string | null; personaSlot?: number | null; content: string; roundNumber?: number | null; createdAt: Date | string }>;
}): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 56, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", c => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.font("Helvetica").fontSize(10).fillColor("#7c2d12").text("SYN - CHAT-VERLAUF", { characterSpacing: 1.6 });
    doc.moveDown(0.6);
    doc.font("Helvetica-Bold").fontSize(26).fillColor("#3f1f0f").text(data.session.title);
    doc.moveDown(0.6);
    const created = new Date(data.session.createdAt);
    doc.font("Helvetica").fontSize(10).fillColor(C_MUTED)
      .text(`Runde ${data.session.currentRound} - ${data.personas.length} Personas`);
    doc.text(`Erstellt: ${created.toLocaleString("de-DE")}`);
    doc.text(`Export:   ${new Date().toLocaleString("de-DE")}`);
    doc.moveDown(1);
    drawRule(doc);
    doc.moveDown(1);

    if (data.session.problemBrief) {
      sectionTitle(doc, "Problem Brief");
      doc.font("Helvetica").fontSize(11).fillColor(C_BODY).text(data.session.problemBrief, { align: "left", lineGap: 2 });
      doc.moveDown(1.2);
    }

    if (data.personas.length) {
      sectionTitle(doc, "Panel");
      const sorted = data.personas.slice().sort((a, b) => (a.slack_slot || 0) - (b.slack_slot || 0));
      for (const p of sorted) {
        const slot = p.slack_slot ?? 0;
        const color = SLOT_COLOR[slot] || "#1c1917";
        const pillY = doc.y + 1;
        const pillX = doc.page.margins.left;
        doc.rect(pillX, pillY, 14, 14).fillColor(color).fill();
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff").text(String(slot), pillX, pillY + 2, { width: 14, align: "center" });
        doc.font("Helvetica-Bold").fontSize(12).fillColor(color).text(`${p.name ?? "Persona"}`, pillX + 22, pillY - 1, { continued: !!(p.type && p.type.toLowerCase() !== "human") });
        if (p.type && p.type.toLowerCase() !== "human") {
          doc.font("Helvetica").fontSize(11).fillColor(C_MUTED).text(`  -  ${p.type}`);
        }
        doc.moveDown(0.3);
        if (p.core_perspective) {
          renderRichLine(doc, p.core_perspective, { fontSize: 10, color: C_BODY, indent: 22, lineGap: 2 });
          doc.moveDown(0.2);
        }
        if (p.profile) {
          renderRichLine(doc, p.profile.slice(0, 400), { fontSize: 9.5, color: C_MUTED, indent: 22, lineGap: 1.5 });
        }
        doc.moveDown(0.7);
      }
    }

    doc.addPage();
    sectionTitle(doc, "Chat-Verlauf");

    let lastDate = "";
    for (const m of data.messages) {
      const ts = new Date(m.createdAt);
      const dateKey = ts.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
      if (dateKey !== lastDate) {
        if (lastDate) doc.moveDown(0.4);
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#a16207").text(dateKey.toUpperCase(), { characterSpacing: 1.2 });
        doc.moveDown(0.3);
        drawRule(doc, "#d6d3d1", 0.5);
        doc.moveDown(0.4);
        lastDate = dateKey;
      }
      const label = labelFor(m);
      const color = colorFor(m);
      const tsTxt = ts.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
      const slot = m.personaSlot ?? 0;
      const accent = m.role === "persona" && SLOT_COLOR[slot] ? SLOT_COLOR[slot] : color;
      const dotY = doc.y + 3;
      const dotX = doc.page.margins.left;
      doc.circle(dotX + 3, dotY + 2, 3).fillColor(accent).fill();
      doc.font("Helvetica-Bold").fontSize(11).fillColor(accent).text(label, dotX + 14, doc.y - 1, { continued: true });
      doc.font("Helvetica").fontSize(9).fillColor(C_FAINT).text(`   ${tsTxt}`);
      doc.moveDown(0.25);
      if (m.role === "synthesis") {
        renderMarkdownBlock(doc, m.content);
      } else {
        renderRichLine(doc, m.content, { fontSize: 10.5, color: C_BODY, indent: 14, lineGap: 2 });
      }
      doc.moveDown(0.7);
    }

    if (data.syntheses.length) {
      doc.addPage();
      sectionTitle(doc, "Synthesen");
      const sortedSyn = data.syntheses.slice().sort((a, b) => a.round_number - b.round_number);
      for (const s of sortedSyn) {
        doc.font("Helvetica-Bold").fontSize(13).fillColor("#a16207").text(`Runde ${s.round_number}`);
        doc.moveDown(0.4);
        renderMarkdownBlock(doc, s.synthesis_text);
        doc.moveDown(1);
      }
    }

    const range = doc.bufferedPageRange();
    const totalPages = range.count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(range.start + i);
      const savedBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      const bottomY = doc.page.height - 32;
      const contentW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      doc.font("Helvetica").fontSize(8).fillColor(C_FAINT)
        .text(`Syn - ${data.session.title}`, doc.page.margins.left, bottomY, {
          width: contentW, align: "left", lineBreak: false
        })
        .text(`Seite ${i + 1} / ${totalPages}`, doc.page.margins.left, bottomY, {
          width: contentW, align: "right", lineBreak: false
        });
      doc.page.margins.bottom = savedBottom;
    }
    doc.end();
  });
}

export async function GET(_: Request, { params }: P) {
  const u = await requireUser();
  const { id } = await params;
  const [sess] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id))).limit(1);
  if (!sess) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [msgs, state] = await Promise.all([
    db.select().from(messages).where(eq(messages.sessionId, id)).orderBy(asc(messages.createdAt)),
    readState(id).catch(() => ({ personas: [], syntheses: [] }))
  ]);
  const pdf = await buildPDF({
    session: { title: sess.title, currentRound: sess.currentRound, problemBrief: sess.problemBrief, createdAt: sess.createdAt },
    personas: state.personas,
    syntheses: state.syntheses,
    messages: msgs
  });
  const safeName = sess.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="syn-${safeName}.pdf"`
    }
  });
}

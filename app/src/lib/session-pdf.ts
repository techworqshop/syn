import PDFDocument from "pdfkit";
import type { Locale } from "@/lib/i18n";

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

const C_BODY  = "#292524";
const C_MUTED = "#57534e";
const C_FAINT = "#a8a29e";
const C_DIV   = "#a16207";

function roleLabel(role: string, locale: Locale): string {
  if (role === "user") return locale === "en" ? "You" : "Du";
  if (role === "coordinator") return "Syn";
  if (role === "persona") return "Persona";
  if (role === "synthesis") return locale === "en" ? "Synthesis" : "Synthese";
  if (role === "system") return "System";
  return role;
}

function labelFor(m: { role: string; personaName?: string | null; personaSlot?: number | null; roundNumber?: number | null }, locale: Locale): string {
  if (m.role === "persona") return m.personaName || `Persona ${m.personaSlot ?? ""}`.trim();
  if (m.role === "synthesis") {
    const head = locale === "en" ? "Synthesis - Round" : "Synthese - Runde";
    return `${head} ${m.roundNumber ?? ""}`.trim();
  }
  return roleLabel(m.role, locale);
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
function renderMarkdownBlock(doc: InstanceType<typeof PDFDocument>, text: string | null | undefined) {
  if (!text) return;
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

function ensureSpace(doc: InstanceType<typeof PDFDocument>, h: number) {
  if (doc.y + h > doc.page.height - doc.page.margins.bottom) doc.addPage();
}

// Header line above a chat message: speaker name + time. User right, others left.
function chatHeader(doc: InstanceType<typeof PDFDocument>, isUser: boolean, label: string, tsTxt: string, accent: string) {
  const pageLeft = doc.page.margins.left;
  const contentW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  ensureSpace(doc, 26);
  if (isUser) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(accent)
      .text(`${label}  ·  ${tsTxt}`, pageLeft, doc.y, { width: contentW, align: "right" });
    doc.moveDown(0.15);
  } else {
    const y = doc.y;
    doc.circle(pageLeft + 3, y + 5, 3).fillColor(accent).fill();
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(accent).text(label, pageLeft + 12, y, { continued: true });
    doc.font("Helvetica").fontSize(8).fillColor(C_FAINT).text(`   ${tsTxt}`);
    doc.moveDown(0.15);
  }
}

// One paragraph as a chat bubble. Long paragraphs that exceed a full page fall
// back to plain flowing text so nothing gets clipped across page breaks.
function bubbleChunk(doc: InstanceType<typeof PDFDocument>, text: string, isUser: boolean, accent: string) {
  const pageLeft = doc.page.margins.left;
  const pageRight = doc.page.width - doc.page.margins.right;
  const contentW = pageRight - pageLeft;
  const maxW = Math.min(372, contentW * 0.78);
  const padX = 11, padY = 8;
  const innerW = maxW - 2 * padX;
  const pageBottom = doc.page.height - doc.page.margins.bottom;
  const usable = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;

  doc.font("Helvetica").fontSize(10);
  const bodyH = doc.heightOfString(text, { width: innerW, lineGap: 2.5 });

  // Too tall for any single page -> plain flow, no box.
  if (bodyH + 2 * padY > usable - 10) {
    ensureSpace(doc, 40);
    doc.font("Helvetica").fontSize(10).fillColor(C_BODY)
      .text(text, pageLeft + (isUser ? 0 : 6), doc.y, { width: contentW - 6, lineGap: 2.5 });
    doc.moveDown(0.4);
    return;
  }

  const h = bodyH + 2 * padY;
  if (doc.y + h + 6 > pageBottom) doc.addPage();
  const x = isUser ? (pageRight - maxW) : pageLeft;
  const y = doc.y;
  doc.roundedRect(x, y, maxW, h, 9);
  doc.fillColor(isUser ? "#E8F2EC" : "#FBF8F2").strokeColor(isUser ? "#CDE3D6" : "#EAE4D6").lineWidth(0.6).fillAndStroke();
  const sw = 3;
  doc.save();
  doc.roundedRect(x, y, maxW, h, 9).clip();
  doc.rect(isUser ? x + maxW - sw : x, y, sw, h).fillColor(accent).fill();
  doc.restore();
  doc.font("Helvetica").fontSize(10).fillColor(C_BODY)
    .text(text, x + padX, y + padY, { width: innerW, lineGap: 2.5 });
  doc.y = y + h + 5;
}

// Render a single chat message bubble-style. Synthesis = wide markdown block.
function renderChatMessage(doc: InstanceType<typeof PDFDocument>, m: { role: string; personaName?: string | null; personaSlot?: number | null; content: string; roundNumber?: number | null; createdAt: Date | string }, locale: Locale) {
  const isUser = m.role === "user";
  const isSynth = m.role === "synthesis";
  const slot = m.personaSlot ?? 0;
  let accent = m.role === "persona" && SLOT_COLOR[slot] ? SLOT_COLOR[slot] : (ROLE_COLOR[m.role] || C_MUTED);
  if (isUser) accent = "#2F6F4F";
  const label = labelFor(m, locale);
  const tsTxt = new Date(m.createdAt).toLocaleTimeString(locale === "en" ? "en-US" : "de-DE", { hour: "2-digit", minute: "2-digit" });

  if (isSynth) {
    ensureSpace(doc, 50);
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(accent)
      .text(`${label}`.toUpperCase(), doc.page.margins.left, doc.y, { characterSpacing: 0.8 });
    doc.moveDown(0.25);
    renderMarkdownBlock(doc, m.content);
    doc.moveDown(0.6);
    return;
  }

  chatHeader(doc, isUser, label, tsTxt, accent);
  const paras = (m.content || "").replace(/\*\*/g, "").split(/\n{2,}/).map(t => t.trim()).filter(Boolean);
  if (!paras.length) { doc.moveDown(0.4); return; }
  for (const para of paras) bubbleChunk(doc, para, isUser, accent);
  doc.moveDown(0.5);
}

export function buildPDF(data: {
  session: { title: string; currentRound: number; problemBrief: string | null; createdAt: Date | string };
  personas: Array<{ name?: string; type?: string; core_perspective?: string; profile?: string; slack_slot?: number; rigidity?: number }>;
  syntheses: Array<{ round_number: number | null; synthesis_text: string | null }>;
  messages: Array<{ role: string; personaName?: string | null; personaSlot?: number | null; content: string; roundNumber?: number | null; createdAt: Date | string }>;
  locale: Locale;
}): Promise<Buffer> {
  const locale = data.locale;
  const en = locale === "en";
  const dtLocale = en ? "en-US" : "de-DE";
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 56, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", c => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.font("Helvetica").fontSize(10).fillColor("#7c2d12").text(en ? "SYN - CHAT LOG" : "SYN - CHAT-VERLAUF", { characterSpacing: 1.6 });
    doc.moveDown(0.6);
    doc.font("Helvetica-Bold").fontSize(26).fillColor("#3f1f0f").text(data.session.title);
    doc.moveDown(0.6);
    const created = new Date(data.session.createdAt);
    doc.font("Helvetica").fontSize(10).fillColor(C_MUTED)
      .text(en ? `Round ${data.session.currentRound} - ${data.personas.length} personas` : `Runde ${data.session.currentRound} - ${data.personas.length} Personas`);
    doc.text(`${en ? "Created:" : "Erstellt:"} ${created.toLocaleString(dtLocale)}`);
    doc.text(`Export:   ${new Date().toLocaleString(dtLocale)}`);
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
    sectionTitle(doc, en ? "Chat Log" : "Chat-Verlauf");

    let lastDate = "";
    const fullW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    for (const m of data.messages) {
      const ts = new Date(m.createdAt);
      const dateKey = ts.toLocaleDateString(dtLocale, { day: "2-digit", month: "long", year: "numeric" });
      if (dateKey !== lastDate) {
        if (lastDate) doc.moveDown(0.6);
        ensureSpace(doc, 34);
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#a16207")
          .text(dateKey.toUpperCase(), doc.page.margins.left, doc.y, { characterSpacing: 1.4, width: fullW, align: "center" });
        doc.moveDown(0.35);
        drawRule(doc, "#e7e2d6", 0.5);
        doc.moveDown(0.6);
        lastDate = dateKey;
      }
      renderChatMessage(doc, m, locale);
    }

    if (data.syntheses.filter(s => s.round_number && s.synthesis_text).length) {
      doc.addPage();
      sectionTitle(doc, en ? "Syntheses" : "Synthesen");
      const sortedSyn = data.syntheses.filter(s => s.round_number && s.synthesis_text).sort((a, b) => (a.round_number ?? 0) - (b.round_number ?? 0));
      for (const s of sortedSyn) {
        doc.font("Helvetica-Bold").fontSize(13).fillColor("#a16207").text(`${en ? "Round" : "Runde"} ${s.round_number}`);
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
        .text(`${en ? "Page" : "Seite"} ${i + 1} / ${totalPages}`, doc.page.margins.left, bottomY, {
          width: contentW, align: "right", lineBreak: false
        });
      doc.page.margins.bottom = savedBottom;
    }
    doc.end();
  });
}

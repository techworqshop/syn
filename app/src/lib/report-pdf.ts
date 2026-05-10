import PDFDocument from "pdfkit";

export type ReportPersona = {
  name?: string; type?: string; core_perspective?: string; profile?: string;
  slack_slot?: number; rigidity?: number;
};

const C_BODY  = "#292524";
const C_MUTED = "#57534e";
const C_FAINT = "#a8a29e";

function drawRule(doc: InstanceType<typeof PDFDocument>, color = "#a16207", weight = 0.6) {
  const x1 = doc.page.margins.left;
  const x2 = doc.page.width - doc.page.margins.right;
  doc.moveTo(x1, doc.y).lineTo(x2, doc.y).strokeColor(color).lineWidth(weight).stroke();
}

function renderInlineBold(doc: InstanceType<typeof PDFDocument>, text: string, opts: { bullet: boolean }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  const indent = opts.bullet ? 16 : 0;
  if (opts.bullet) {
    doc.fontSize(11).fillColor("#a16207").text("-", { continued: true, indent: 4 })
      .fillColor(C_BODY).text(" ", { continued: true });
  }
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const isLast = i === parts.length - 1;
    const isBold = /^\*\*[^*]+\*\*$/.test(p);
    const clean = isBold ? p.replace(/^\*\*|\*\*$/g, "") : p;
    if (isBold) {
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#1c1917").text(clean, { continued: !isLast, indent: opts.bullet ? 0 : indent });
    } else {
      doc.font("Helvetica").fontSize(11).fillColor(C_BODY).text(clean, { continued: !isLast, indent: opts.bullet ? 0 : indent });
    }
  }
  doc.font("Helvetica");
  if (opts.bullet) doc.moveDown(0.2);
  else doc.moveDown(0.4);
}

export function renderReportPDF(
  title: string,
  meta: { createdAt: Date | string; personaCount: number; currentRound: number },
  _personas: ReportPersona[],
  reportMd: string
): Promise<Buffer> {
  return new Promise(resolve => {
    const doc = new PDFDocument({ size: "A4", margin: 56, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", c => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    // Cover
    doc.font("Helvetica").fontSize(10).fillColor("#7c2d12").text("SYN - ABSCHLUSSBERICHT", { characterSpacing: 1.6 });
    doc.moveDown(0.6);
    doc.font("Helvetica-Bold").fontSize(26).fillColor("#3f1f0f").text(title);
    doc.moveDown(0.6);
    const created = new Date(meta.createdAt);
    doc.font("Helvetica").fontSize(10).fillColor(C_MUTED)
      .text(`Erstellt: ${created.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}`);
    doc.text(`${meta.personaCount} Personas / ${meta.currentRound} Runden`);
    doc.text(`Export: ${new Date().toLocaleString("de-DE")}`);
    doc.moveDown(1);
    drawRule(doc, "#a16207", 1);
    doc.moveDown(1.2);

    // Body — strip trailing whitespace/separators so we don't bleed onto blank pages
    const trimmed = reportMd
      .replace(/\s+$/, "")           // hard trim trailing whitespace
      .replace(/(\n\s*---+\s*)+$/g, "") // trailing markdown rules
      .replace(/(\n\s*){3,}/g, "\n\n"); // collapse 3+ blank lines to one
    const lines = trimmed.split(/\r?\n/);
    let inList = false;
    for (const raw of lines) {
      const line = raw;
      if (/^\s*---+\s*$/.test(line)) {
        if (inList) { inList = false; doc.moveDown(0.3); }
        doc.moveDown(0.3);
        continue;
      }
      if (/^#\s+/.test(line)) {
        if (inList) { inList = false; doc.moveDown(0.3); }
        doc.moveDown(0.6);
        doc.font("Helvetica-Bold").fontSize(20).fillColor("#9f1239").text(line.replace(/^#\s+/, ""));
        doc.moveDown(0.4);
      } else if (/^##\s+/.test(line)) {
        if (inList) { inList = false; doc.moveDown(0.3); }
        const txt = line.replace(/^##\s+/, "");
        const isNumbered = /^\s*\d+\.\s/.test(txt);
        if (isNumbered) {
          doc.moveDown(0.4);
          drawRule(doc, "#a16207", 0.8);
          doc.moveDown(0.3);
        } else {
          doc.moveDown(0.5);
        }
        doc.font("Helvetica-Bold").fontSize(15).fillColor("#7c2d12").text(txt);
        doc.moveDown(0.3);
      } else if (/^###\s+/.test(line)) {
        if (inList) { inList = false; doc.moveDown(0.2); }
        doc.moveDown(0.3);
        doc.font("Helvetica-Bold").fontSize(12).fillColor("#4d7c0f").text(line.replace(/^###\s+/, ""));
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

    // Footer — writing near the bottom triggers PDFKit's auto-page-break
    // which silently adds blank pages. Workaround: zero the bottom margin
    // for the duration of each footer write, then restore.
    const range = doc.bufferedPageRange();
    const totalPages = range.count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(range.start + i);
      const savedBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      const bottomY = doc.page.height - 32;
      const contentW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      doc.font("Helvetica").fontSize(8).fillColor(C_FAINT)
        .text(`Syn - ${title}`, doc.page.margins.left, bottomY, {
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

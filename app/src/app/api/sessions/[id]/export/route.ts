import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import fs from "node:fs";
import { db } from "@/lib/db";
import { sessions, messages, audienceMessages, files } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { readState } from "@/lib/n8n";
import { and, eq, asc } from "drizzle-orm";

type P = { params: Promise<{ id: string }> };

const ROLE_COLOR: Record<string, string> = {
  user: "#38bdf8",
  coordinator: "#d946ef",
  persona: "#a78bfa",
  synthesis: "#fbbf24",
  system: "#f59e0b"
};
const ROLE_LABEL: Record<string, string> = {
  user: "Du",
  coordinator: "Syn",
  persona: "Persona",
  synthesis: "Synthese",
  system: "System"
};

function buildPDF(data: {
  session: { title: string; status: string; currentRound: number; problemBrief: string | null; createdAt: Date | string };
  personas: Array<{ name?: string; type?: string; core_perspective?: string; profile?: string; slack_slot?: number }>;
  syntheses: Array<{ round_number: number; synthesis_text: string }>;
  messages: Array<{ role: string; personaName?: string | null; personaSlot?: number | null; content: string; roundNumber?: number | null; createdAt: Date | string }>;
}): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", c => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    // Header
    doc.fontSize(22).fillColor("#f4f1f7").text(data.session.title, { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#716b7d")
      .text(`Status: ${data.session.status}  -  Runde ${data.session.currentRound}`);
    const created = new Date(data.session.createdAt);
    doc.text(`Erstellt: ${created.toLocaleString("de-DE")}  -  Export: ${new Date().toLocaleString("de-DE")}`);
    doc.moveDown(1);
    doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor("#2a1f3a").stroke();
    doc.moveDown(0.8);

    if (data.session.problemBrief) {
      doc.fontSize(14).fillColor("#d946ef").text("Problem Brief");
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor("#d4d1da").text(data.session.problemBrief, { align: "left" });
      doc.moveDown(1);
    }

    if (data.personas.length) {
      doc.fontSize(14).fillColor("#d946ef").text("Panel");
      doc.moveDown(0.4);
      for (const p of data.personas.sort((a,b) => (a.slack_slot||0) - (b.slack_slot||0))) {
        doc.fontSize(12).fillColor("#a78bfa").text(`${p.name ?? "Persona"} - ${p.type ?? ""}`);
        if (p.core_perspective) doc.fontSize(10).fillColor("#b8b2c0").text(p.core_perspective);
        if (p.profile) doc.fontSize(9).fillColor("#8b8595").text(p.profile.slice(0, 400));
        doc.moveDown(0.6);
      }
      doc.moveDown(0.4);
    }

    // Chat log
    doc.addPage();
    doc.fontSize(14).fillColor("#d946ef").text("Chat-Verlauf");
    doc.moveDown(0.5);
    for (const m of data.messages) {
      const label = m.role === "persona"
        ? (m.personaName || `Persona ${m.personaSlot || ""}`)
        : m.role === "synthesis"
          ? `Synthese Runde ${m.roundNumber ?? ""}`
          : (ROLE_LABEL[m.role] || m.role);
      const color = ROLE_COLOR[m.role] || "#9ca3af";
      const ts = new Date(m.createdAt).toLocaleString("de-DE", {
        dateStyle: "short", timeStyle: "short"
      });
      doc.fontSize(11).fillColor(color).text(label, { continued: true })
        .fillColor("#716b7d").text(`  ${ts}`);
      doc.fontSize(10).fillColor("#d4d1da").text(m.content, { align: "left" });
      doc.moveDown(0.8);
    }

    // Syntheses
    if (data.syntheses.length) {
      doc.addPage();
      doc.fontSize(14).fillColor("#fbbf24").text("Synthesen");
      doc.moveDown(0.5);
      for (const s of data.syntheses.sort((a,b) => a.round_number - b.round_number)) {
        doc.fontSize(12).fillColor("#fbbf24").text(`Runde ${s.round_number}`);
        doc.moveDown(0.2);
        doc.fontSize(10).fillColor("#d4d1da").text(s.synthesis_text, { align: "left" });
        doc.moveDown(1);
      }
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
    session: { title: sess.title, status: sess.status, currentRound: sess.currentRound, problemBrief: sess.problemBrief, createdAt: sess.createdAt },
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

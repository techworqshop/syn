import { db } from "@/lib/db";
import { sessions, messages, files } from "@/db/schema";
import { readState } from "@/lib/n8n";
import { eq, asc } from "drizzle-orm";

type P = { params: Promise<{ token: string }> };

function rigidityLabel(r?: number): string {
  const v = typeof r === "number" ? r : 5;
  if (v <= 3) return "standhaft";
  if (v <= 6) return "ausgewogen";
  return "offen";
}

export async function GET(_: Request, { params }: P) {
  const { token } = await params;
  const [sess] = await db.select().from(sessions)
    .where(eq(sessions.shareToken, token)).limit(1);
  if (!sess) return new Response("not found", { status: 404 });

  const [msgs, sessionFiles, state] = await Promise.all([
    db.select().from(messages).where(eq(messages.sessionId, sess.id)).orderBy(asc(messages.createdAt)),
    db.select().from(files).where(eq(files.sessionId, sess.id)).orderBy(asc(files.createdAt)),
    readState(sess.id).catch(() => ({ personas: [] as Array<{ name?: string; type?: string; core_perspective?: string; profile?: string; slack_slot?: number; rigidity?: number }>, syntheses: [] as Array<{ round_number: number; synthesis_text: string }> }))
  ]);

  const created = new Date(sess.createdAt);
  const out: string[] = [];

  // Header
  out.push(`# ${sess.title}`);
  out.push("");
  out.push(`> Geteilte Syn-Fokusgruppe (Read-only)`);
  out.push(`> Erstellt: ${created.toLocaleString("de-DE")}`);
  out.push(`> Export: ${new Date().toLocaleString("de-DE")}`);
  out.push(`> Runde ${sess.currentRound} - ${sess.personaCount} Personas - ${sessionFiles.length} Dateien`);
  out.push("");

  // Problem Brief
  if (sess.problemBrief) {
    out.push("## Problem Brief");
    out.push("");
    out.push(sess.problemBrief);
    out.push("");
  }

  // Panel
  if (state.personas.length) {
    out.push("## Panel");
    out.push("");
    const sorted = state.personas.slice().sort((a, b) => (a.slack_slot || 0) - (b.slack_slot || 0));
    for (const p of sorted) {
      const typ = p.type && p.type.toLowerCase() !== "human" ? `, ${p.type}` : "";
      const rl = rigidityLabel(p.rigidity);
      out.push(`### ${p.name || "Persona"}${typ}`);
      out.push(`*Haltung: ${rl} (${p.rigidity ?? 5}/10)*`);
      out.push("");
      if (p.core_perspective) {
        out.push(`**Perspektive:** ${p.core_perspective}`);
        out.push("");
      }
      if (p.profile) {
        out.push(`**Profil:** ${p.profile}`);
        out.push("");
      }
    }
  }

  // Files
  if (sessionFiles.length) {
    out.push("## Dateien");
    out.push("");
    for (const f of sessionFiles) {
      const catLabel = f.category === "briefing" ? "Briefing" : f.category === "persona" ? "Persona-Daten" : "Panel-Review";
      const kb = Math.round(f.sizeBytes / 1024);
      const sizeLabel = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
      out.push(`- **${f.fileName}** (${catLabel}, ${sizeLabel})`);
      if (f.summary && f.summary !== "[wird analysiert]" && f.summary !== "[analysiert]") {
        out.push(`  ${f.summary.replace(/\n/g, "\n  ").slice(0, 800)}`);
      }
    }
    out.push("");
  }

  // Chat
  out.push("## Chat-Verlauf");
  out.push("");
  let lastDate = "";
  const labelFor = (m: typeof msgs[number]): string => {
    if (m.role === "persona") return m.personaName || `Persona ${m.personaSlot ?? ""}`.trim();
    if (m.role === "synthesis") return `Synthese - Runde ${m.roundNumber ?? ""}`.trim();
    if (m.role === "coordinator") return "Syn";
    if (m.role === "user") return "Du";
    if (m.role === "system") return "System";
    return m.role;
  };
  for (const m of msgs) {
    const ts = new Date(m.createdAt);
    const dateKey = ts.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
    if (dateKey !== lastDate) {
      out.push(`### ${dateKey}`);
      out.push("");
      lastDate = dateKey;
    }
    const timeKey = ts.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    const label = labelFor(m);
    const round = m.roundNumber && m.role === "persona" ? ` *(Runde ${m.roundNumber})*` : "";
    out.push(`**${label}**${round} - ${timeKey}`);
    out.push("");
    out.push(m.content);
    out.push("");
    out.push("---");
    out.push("");
  }

  // Trim trailing empty separators
  while (out.length && (out[out.length - 1] === "" || out[out.length - 1] === "---")) out.pop();

  const body = out.join("\n");
  const safeName = sess.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="syn-${safeName}.md"`
    }
  });
}

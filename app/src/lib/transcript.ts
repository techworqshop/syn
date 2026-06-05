import type { Locale } from "@/lib/i18n";

type Persona = { name?: string; type?: string; core_perspective?: string; profile?: string; slack_slot?: number; rigidity?: number };
type Synthesis = { round_number: number; synthesis_text: string };
type Msg = { role: string; personaName?: string | null; personaSlot?: number | null; content: string; roundNumber?: number | null; createdAt: Date | string };
type FileRow = { fileName: string; summary?: string | null; sizeBytes: number; category: string };
type Sess = { title: string; createdAt: Date | string; currentRound: number; personaCount: number; problemBrief: string | null };

function rigidityLabel(r: number | undefined, locale: Locale): string {
  const v = typeof r === "number" ? r : 5;
  if (locale === "en") {
    if (v <= 3) return "firm";
    if (v <= 6) return "balanced";
    return "open";
  }
  if (v <= 3) return "standhaft";
  if (v <= 6) return "ausgewogen";
  return "offen";
}

export function buildTranscriptMarkdown(args: {
  session: Sess;
  messages: Msg[];
  files: FileRow[];
  state: { personas: Persona[]; syntheses: Synthesis[] };
  locale: Locale;
}): string {
  const { session: sess, messages: msgs, files: sessionFiles, state, locale } = args;
  const en = locale === "en";
  const dt = en ? "en-US" : "de-DE";
  const created = new Date(sess.createdAt);
  const out: string[] = [];

  // Header
  out.push(`# ${sess.title}`);
  out.push("");
  out.push(`> ${en ? "Shared Syn focus group (read-only)" : "Geteilte Syn-Fokusgruppe (Read-only)"}`);
  out.push(`> ${en ? "Created" : "Erstellt"}: ${created.toLocaleString(dt)}`);
  out.push(`> Export: ${new Date().toLocaleString(dt)}`);
  out.push(`> ${en ? "Round" : "Runde"} ${sess.currentRound} - ${sess.personaCount} ${en ? "personas" : "Personas"} - ${sessionFiles.length} ${en ? "files" : "Dateien"}`);
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
      const rl = rigidityLabel(p.rigidity, locale);
      out.push(`### ${p.name || "Persona"}${typ}`);
      out.push(`*${en ? "Stance" : "Haltung"}: ${rl} (${p.rigidity ?? 5}/10)*`);
      out.push("");
      if (p.core_perspective) {
        out.push(`**${en ? "Perspective" : "Perspektive"}:** ${p.core_perspective}`);
        out.push("");
      }
      if (p.profile) {
        out.push(`**${en ? "Profile" : "Profil"}:** ${p.profile}`);
        out.push("");
      }
    }
  }

  // Files
  if (sessionFiles.length) {
    out.push(`## ${en ? "Files" : "Dateien"}`);
    out.push("");
    for (const f of sessionFiles) {
      const catLabel = f.category === "briefing"
        ? "Briefing"
        : f.category === "persona"
          ? (en ? "Persona data" : "Persona-Daten")
          : (en ? "Panel review" : "Panel-Review");
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
  out.push(`## ${en ? "Chat Log" : "Chat-Verlauf"}`);
  out.push("");
  let lastDate = "";
  const labelFor = (m: Msg): string => {
    if (m.role === "persona") return m.personaName || `Persona ${m.personaSlot ?? ""}`.trim();
    if (m.role === "synthesis") return `${en ? "Synthesis - Round" : "Synthese - Runde"} ${m.roundNumber ?? ""}`.trim();
    if (m.role === "coordinator") return "Syn";
    if (m.role === "user") return en ? "You" : "Du";
    if (m.role === "system") return "System";
    return m.role;
  };
  for (const m of msgs) {
    const ts = new Date(m.createdAt);
    const dateKey = ts.toLocaleDateString(dt, { day: "2-digit", month: "long", year: "numeric" });
    if (dateKey !== lastDate) {
      out.push(`### ${dateKey}`);
      out.push("");
      lastDate = dateKey;
    }
    const timeKey = ts.toLocaleTimeString(dt, { hour: "2-digit", minute: "2-digit" });
    const label = labelFor(m);
    const round = m.roundNumber && m.role === "persona" ? ` *(${en ? "Round" : "Runde"} ${m.roundNumber})*` : "";
    out.push(`**${label}**${round} - ${timeKey}`);
    out.push("");
    out.push(m.content);
    out.push("");
    out.push("---");
    out.push("");
  }

  // Trim trailing empty separators
  while (out.length && (out[out.length - 1] === "" || out[out.length - 1] === "---")) out.pop();

  return out.join("\n");
}

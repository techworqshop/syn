import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages, audienceMessages, sessions } from "@/db/schema";
import { publish } from "@/lib/redis";
import { readState } from "@/lib/n8n";
import { suggestTitle, suggestTitleFromBrief } from "@/lib/title-gen";
import { generatePersonaImage, MAX_ATTEMPTS } from "@/lib/persona-image-gen";
import { personaImages } from "@/db/schema";
import { eq, asc, and, ne, sql } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { renderReportPDF } from "@/lib/report-pdf";

const REPORTS_DIR = "/app/uploads/reports";

const SECRET = process.env.N8N_CALLBACK_SECRET!;

// Phase-Marker-Parser. Coordinator hängt am Ende seiner Panel-Vorschlag-Messages
// HTML-Kommentare an: <!-- syn:phase=panel_proposed -->, panel_added, panel_updated
// persona=X, panel_removed persona=X. Markdown rendert HTML-Comments nicht — User
// sieht die nie. Die Marker steuern den Pre-Save-Agent (ProposePersonas).
type PhaseOp = { op: "set" | "add" | "update" | "remove" | "brief_set" | "report"; personaId?: string };
function parsePhaseMarkers(text: string): { cleanText: string; ops: PhaseOp[] } {
  const ops: PhaseOp[] = [];
  const re = /<!--\s*syn:phase=(panel_proposed|panel_added|panel_updated|panel_removed|brief_proposed|generate_report)(?:\s+persona=([a-z0-9_-]+))?\s*-->/gi;
  const opMap: Record<string, PhaseOp["op"]> = {
    panel_proposed: "set",
    panel_added: "add",
    panel_updated: "update",
    panel_removed: "remove",
    brief_proposed: "brief_set",
    generate_report: "report"
  };
  const cleanText = text.replace(re, (_m, opName, pid) => {
    const op = opMap[opName.toLowerCase()];
    if (op) ops.push({ op, personaId: pid ? String(pid).toLowerCase() : undefined });
    return "";
  }).replace(/\n{3,}/g, "\n\n").trim();
  return { cleanText, ops };
}

type PanelOp =
  | { op: "set"; personas: Array<Record<string, unknown>> }
  | { op: "upsert"; persona: Record<string, unknown> }
  | { op: "delete"; personaId: string };
function parsePanelBlock(text: string): { cleanText: string; ops: PanelOp[] } {
  const ops: PanelOp[] = [];
  const re = /<!--\s*syn:panel\s+([\s\S]*?)\s*-->/gi;
  const cleanText = text.replace(re, (_m, jsonStr) => {
    try {
      const parsed = JSON.parse(String(jsonStr));
      const arr = Array.isArray(parsed.ops) ? parsed.ops : [parsed];
      for (const o of arr) {
        if (!o || !o.op) continue;
        const op = String(o.op).toLowerCase();
        if (op === "set" && Array.isArray(o.personas)) ops.push({ op: "set", personas: o.personas });
        else if (op === "upsert" && o.persona) ops.push({ op: "upsert", persona: o.persona });
        else if ((op === "delete" || op === "remove") && (o.personaId || o.persona_id)) ops.push({ op: "delete", personaId: String(o.personaId || o.persona_id).toLowerCase() });
      }
    } catch { /* malformed -> ignore */ }
    return "";
  }).replace(/\n{3,}/g, "\n\n").trim();
  return { cleanText, ops };
}




// Maps known n8n-side German status texts to English. Used when session.locale==='en'.
const STATUS_DE_TO_EN: Record<string, string> = {
  "Syn denkt ...": "Syn is thinking ...",
  "Syn speichert Panel ...": "Syn is saving panel ...",
  "Syn fragt Personas ...": "Syn is asking personas ...",
  "Syn macht Synthese ...": "Syn is creating synthesis ...",
  "Syn startet Runde 1 ...": "Syn starts round 1 ...",
  "Syn startet Runde 2 ...": "Syn starts round 2 ...",
  "Syn startet Runde 3 ...": "Syn starts round 3 ..."
};
function translateStatusDeToEn(de: string): string {
  return STATUS_DE_TO_EN[de] || de;
}


type Body = {
  sessionId: string;
  kind: string;
  text: string;
  personaId?: number | string;
  roundNumber?: number;
};

type SessionRow = typeof sessions.$inferSelect;

const SYNC_DEBOUNCE_MS = 3000;
const SYNC_LAST_AT = new Map<string, number>();
async function syncPanelAndImages(sessionId: string, sess: SessionRow) {
  const last = SYNC_LAST_AT.get(sessionId) || 0;
  const now = Date.now();
  if (now - last < SYNC_DEBOUNCE_MS) return;
  SYNC_LAST_AT.set(sessionId, now);
  const state = await readState(sessionId);
  // Only count personas with real content (name set) - empty placeholders should not count.
  const personaCount = state.personas.filter(p => p && p.name && p.name.trim().length > 0).length;
  const derivedRound = Math.max(
    0,
    ...state.syntheses.map(s => s.round_number || 0),
    ...state.personas.flatMap(p => [
      p.round_1_response ? 1 : 0,
      p.round_2_response ? 2 : 0,
      p.round_3_response ? 3 : 0
    ])
  );
  if (personaCount !== sess.personaCount || derivedRound !== sess.currentRound) {
    await db.update(sessions).set({
      personaCount, currentRound: derivedRound, updatedAt: new Date()
    }).where(eq(sessions.id, sessionId));
    await publish(`session:${sessionId}`, {
      type: "session", personaCount, currentRound: derivedRound
    });
  }
  // panel_refresh nur noch bei persona_round - verhindert ReadState-Spam.

  queueImageGen(sessionId, state.personas);
}

const IMAGE_QUEUE = new Map<string, Promise<void>>();

function queueImageGen(sessionId: string, personas: Array<{ slack_slot?: number | null; name?: string | null; type?: string; profile?: string }>) {
  const prev = IMAGE_QUEUE.get(sessionId) ?? Promise.resolve();
  const next = prev.then(async () => {
    const existingImgs = await db.select().from(personaImages)
      .where(eq(personaImages.sessionId, sessionId));
    const byslot = new Map(existingImgs.map(r => [r.slot, r]));
    for (const p of personas) {
      const slot = p.slack_slot;
      if (!slot) continue;
      const curName = (p.name || "").trim();
      const row = byslot.get(slot);
      const gen = row ? (row.generatedName ?? null) : null;
      // null = legacy/untracked row -> assume current image is fine; backfill below.
      const nameMatches = !!row && (gen === null || gen === curName);
      // Keep chat-bubble persona names in sync with the current slot identity
      // (covers nachtraegliche Umbenennung einer Persona).
      if (curName) {
        await db.update(messages).set({ personaName: curName })
          .where(and(eq(messages.sessionId, sessionId), eq(messages.personaSlot, slot), ne(messages.personaName, curName)));
      }
      // Legacy ready row (untracked) -> backfill name, NO regen, so future renames are detectable.
      if (row && row.status === "ready" && gen === null && curName) {
        await db.update(personaImages).set({ generatedName: curName })
          .where(and(eq(personaImages.sessionId, sessionId), eq(personaImages.slot, slot)));
      }
      // Tracked persona changed identity -> stale portrait. Reset so it regenerates.
      if (row && row.status === "ready" && gen !== null && gen !== curName) {
        await db.update(personaImages).set({ status: "pending", storagePath: null, attempts: 0, lastError: null })
          .where(and(eq(personaImages.sessionId, sessionId), eq(personaImages.slot, slot)));
      }
      const upToDate = row?.status === "ready" && nameMatches;
      const exhausted = !!row && row.attempts >= MAX_ATTEMPTS && nameMatches;
      if (upToDate || exhausted) continue;
      const result = await generatePersonaImage({
        sessionId, slot, name: p.name || "", type: p.type, profile: p.profile
      });
      await publish(`session:${sessionId}`, { type: "persona_image", slot, status: result }).catch(() => {});
      await new Promise(r => setTimeout(r, 1500));
    }
  }).catch(e => { console.error(`[image-queue] session=${sessionId}`, e); });
  IMAGE_QUEUE.set(sessionId, next);
  next.finally(() => {
    if (IMAGE_QUEUE.get(sessionId) === next) IMAGE_QUEUE.delete(sessionId);
  });
}

export async function POST(req: Request) {
  const hdr = req.headers.get("x-syn-callback-secret");
  if (!SECRET || hdr !== SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let b: Body;
  try { b = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  if (!b.sessionId || !b.kind) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const [sess] = await db.select().from(sessions).where(eq(sessions.id, b.sessionId)).limit(1);
  if (!sess) return NextResponse.json({ error: "session not found" }, { status: 404 });

  let text = b.text || "";
  let phaseOps: PhaseOp[] = [];
  let panelOps: PanelOp[] = [];
  if (b.kind === "coordinator") {
    const parsed = parsePhaseMarkers(text);
    text = parsed.cleanText;
    phaseOps = parsed.ops;
    const pb = parsePanelBlock(text);
    text = pb.cleanText;
    panelOps = pb.ops;
  }
  if (b.kind === "audience_reply" || b.kind === "audience_no_persona") {
    const slot = typeof b.personaId === "string" ? parseInt(b.personaId) : (b.personaId ?? 0);
    const [row] = await db.insert(audienceMessages).values({
      sessionId: b.sessionId, personaSlot: slot, role: "persona", content: text
    }).returning();
    await publish(`session:${b.sessionId}:audience:${slot}`,
      { type: "audience_message", message: row });
    return NextResponse.json({ ok: true });
  }

  if (b.kind === "persona_saved") {
    // Fired by SavePanel sub-workflow per persona. LIGHTWEIGHT - just
    // publish panel_refresh so sidebar refetches /personas. NO server-side
    // readState here (browser fetch will trigger it once per event, but that
    // is acceptable - previously we ran 2x readState per persona).
    await publish(`session:${b.sessionId}`, { type: "panel_refresh" });
    return NextResponse.json({ ok: true });
  }

  if (b.kind === "proposed_saved") {
    // Fired by SynWeb_ProposePersonas after a persona was upserted with
    // status='proposed'. Kick off image-gen so the avatar is already ready
    // by the time the user confirms (committed). syncPanelAndImages reads
    // all rows from readState (including proposed) and queues only personas
    // that lack a ready image. Idempotent.
    syncPanelAndImages(b.sessionId, sess).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  if (b.kind === "panel_committed") {
    // Round start signal. No chat bubble - the spinner status from message-route
    // (e.g. "Syn startet Runde N") + the RunRound's Notify Round Started status
    // (e.g. "Syn fragt Personas ...") give the user enough feedback.
    SYNC_LAST_AT.delete(b.sessionId);
    syncPanelAndImages(b.sessionId, sess).catch(()=>{});
    return NextResponse.json({ ok: true });
  }




  if (b.kind === "status") {
    // Ephemeral progress indicator - broadcast but don't persist.
    // Translate known German n8n-side texts to EN when session locale is en.
    const t2 = (sess as { locale?: string }).locale === "en"
      ? translateStatusDeToEn(text)
      : text;
    await publish(`session:${b.sessionId}`, { type: "status", text: t2 });
    // Opportunistic: while the agent is working, personas may be getting saved
    // progressively - kick off image-gen for any that exist but have no image yet.
    syncPanelAndImages(b.sessionId, sess).catch(()=>{});
    return NextResponse.json({ ok: true });
  }

  if (b.kind === "final_report") {
    const reportMd = (text && text.trim()) || "# Abschlussbericht\n\nReport konnte nicht generiert werden.";
    try {
      const pdf = await renderReportPDF(
        sess.title,
        { createdAt: sess.createdAt, personaCount: sess.personaCount, currentRound: sess.currentRound },
        [],
        reportMd
      );
      const reportId = crypto.randomUUID();
      const dir = path.join(REPORTS_DIR, b.sessionId);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, reportId + ".pdf"), pdf);
      const safeName = sess.title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
      const filename = "syn-bericht-" + safeName + ".pdf";

      // 1) Post the report content as a normal coordinator text bubble (readable inline)
      const [textRow] = await db.insert(messages).values({
        sessionId: b.sessionId, role: "coordinator",
        content: reportMd,
        metadata: { kind: "report_text" }
      }).returning();
      await publish(`session:${b.sessionId}`, { type: "message", message: textRow });

      // 2) Post the download card right after
      const [row] = await db.insert(messages).values({
        sessionId: b.sessionId, role: "coordinator",
        content: "📄 Abschlussbericht",
        metadata: { kind: "report", reportId, filename, generatedAt: new Date().toISOString() }
      }).returning();
      await publish(`session:${b.sessionId}`, { type: "message", message: row });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      const [errRow] = await db.insert(messages).values({
        sessionId: b.sessionId, role: "coordinator",
        content: "⚠️ Abschlussbericht konnte nicht erstellt werden: " + msg,
        metadata: { kind: "error" }
      }).returning();
      await publish(`session:${b.sessionId}`, { type: "message", message: errRow });
    }
    return NextResponse.json({ ok: true });
  }

  if (b.kind === "error") {
    const content = text.trim() || "⚠️ Da ist was schiefgelaufen. Probier's bitte nochmal.";
    const [row] = await db.insert(messages).values({
      sessionId: b.sessionId,
      role: "coordinator",
      content,
      metadata: { kind: "error" }
    }).returning();
    await publish(`session:${b.sessionId}`, { type: "message", message: row });
    return NextResponse.json({ ok: true });
  }

  let role = "system";
  let personaSlot: number | null = null;
  let personaName: string | null = null;
  if (b.kind === "coordinator") role = "coordinator";
  else if (b.kind === "synthesis") role = "synthesis";
  else if (b.kind === "persona_round") {
    role = "persona";
    const pid = String(b.personaId || "").toLowerCase();
    try {
      const state = await readState(b.sessionId);
      const p = state.personas.find(
        (x) => (x.persona_id || "").toLowerCase() === pid ||
               (x.name || "").toLowerCase() === pid
      );
      if (p) { personaSlot = p.slack_slot ?? null; personaName = p.name ?? pid; }
    } catch {}
    if (!personaSlot) {
      const map: Record<string, number> = { alpha: 1, beta: 2, gamma: 3, sigma: 4, omega: 5 };
      personaSlot = map[pid] ?? null;
    }
    if (!personaName) personaName = pid;
  }

  // skip empty messages
  if (!text.trim()) return NextResponse.json({ ok: true, skipped: true });

  const [row] = await db.insert(messages).values({
    sessionId: b.sessionId,
    role,
    personaSlot,
    personaName,
    content: text,
    roundNumber: b.roundNumber ?? null,
    metadata: { kind: b.kind }
  }).returning();
  await publish(`session:${b.sessionId}`, { type: "message", message: row });

  // Auto-trigger synthesis when all personas of this round have responded.
  // Decoupled from the Coordinator agent so a stuck/canceled turn never loses the synthesis.
  if (b.kind === "persona_round" && typeof b.roundNumber === "number") {
    try {
      const respondedRes = await db.select({ c: sql<number>`count(distinct persona_name)::int` })
        .from(messages)
        .where(and(eq(messages.sessionId, b.sessionId), eq(messages.role, "persona"), eq(messages.roundNumber, b.roundNumber)));
      const responded = Number(respondedRes[0]?.c ?? 0);
      const target = sess.personaCount ?? 0;
      if (target > 0 && responded >= target) {
        const synthExists = await db.select().from(messages)
          .where(and(eq(messages.sessionId, b.sessionId), eq(messages.role, "synthesis"), eq(messages.roundNumber, b.roundNumber)))
          .limit(1);
        if (synthExists.length === 0) {
          const synUrl = process.env.SYNWEB_SYNTHESIZE_WEBHOOK;
          if (synUrl) {
            console.log("[auto-synth] firing for session", b.sessionId, "round", b.roundNumber);
            fetch(synUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: b.sessionId, round_number: b.roundNumber }) }).catch(() => {});
          }
        }
      }
    } catch (e) { console.error("[callback] auto-synthesize trigger failed", e); }
  }

  // If session has reached final round but no synthesis for round 3 is in chat yet,
  // re-publish a "Syn macht Synthese ..." status so the spinner stays visible until
  // the synthesis arrives.
  if (role === "coordinator") {
    const [latestSess] = await db.select().from(sessions).where(eq(sessions.id, b.sessionId)).limit(1);
    if (latestSess && (latestSess.currentRound ?? 0) >= 3) {
      const synthExists = await db.select().from(messages)
        .where(and(eq(messages.sessionId, b.sessionId), eq(messages.role, "synthesis"), eq(messages.roundNumber, 3)))
        .limit(1);
      if (synthExists.length === 0) {
        const synthText = (latestSess as { locale?: string }).locale === "en"
          ? "Syn is creating synthesis ..."
          : "Syn macht Synthese ...";
        await publish(`session:${b.sessionId}`, { type: "status", text: synthText });
      }
    }
  }

  // Fallback: heuristic title-gen (used when no brief_proposed marker came —
  // e.g. legacy sessions or unmarked coordinator outputs). Brief-marker path
  // above sets titleLocked=true, so this branch is skipped after a real brief.
  if (role === "coordinator" && !sess.titleLocked && (sess.title === "Neue Fokusgruppe" || !sess.title)) {
    // Re-fetch to see if the brief-marker path just set the title
    const [refresh] = await db.select().from(sessions).where(eq(sessions.id, b.sessionId)).limit(1);
    if (refresh && !refresh.titleLocked && (refresh.title === "Neue Fokusgruppe" || !refresh.title)) {
      const allMsgs = await db.select().from(messages)
        .where(eq(messages.sessionId, b.sessionId)).orderBy(asc(messages.createdAt));
      const firstUserMsgs = allMsgs.filter(m => m.role === "user").map(m => m.content).slice(0, 3);
      if (firstUserMsgs.length >= 1) {
        const suggestion = await suggestTitle(null, firstUserMsgs);
        if (suggestion && suggestion.length >= 4) {
          await db.update(sessions).set({ title: suggestion, updatedAt: new Date() })
            .where(eq(sessions.id, b.sessionId));
          await publish(`session:${b.sessionId}`, { type: "session", title: suggestion });
        }
      }
    }
  }
  if (role === "coordinator" || role === "persona" || role === "synthesis") {
    syncPanelAndImages(b.sessionId, sess).catch(()=>{});
  }

  // Auto-trigger the final report once the third (last) round synthesis lands.
  // Internal fetch — fire-and-forget so the callback returns immediately.
  if (role === "synthesis" && b.roundNumber === 3) {
    const baseUrl = process.env.PUBLIC_BASE_URL || "https://syn.worqshop.io";
    fetch(`${baseUrl}/api/sessions/${b.sessionId}/final-report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Syn-Callback-Secret": SECRET || ""
      },
      body: JSON.stringify({ auto: true })
    }).catch(() => {});
  }

  // PRE-SAVE DISPATCH: route each phase-marker the coordinator emitted to
  // SynWeb_ProposePersonas. The sub-workflow uses Haiku to parse the (already-
  // stripped) text into structured personas and upserts them with
  // status='proposed'. Operations:
  //   set    — full replace of the proposed snapshot (initial panel)
  //   add    — append one or more new personas to the snapshot
  //   update — overwrite an existing persona by persona_id
  //   remove — drop a persona by persona_id (no Haiku parse needed)
  // Multiple markers → sequential dispatch (ProposePersonas itself uses an
  // advisory-lock on session_id to serialize against concurrent writes).
  if (role === "coordinator" && (phaseOps.length > 0 || panelOps.length > 0)) {
    // brief_set is a special op: not panel-related, just title generation.
    // Handle it inline (no sub-workflow needed), then continue with persona ops.
    const briefOp = phaseOps.find(o => o.op === "brief_set");
    if (briefOp && !sess.titleLocked) {
      try {
        const title = await suggestTitleFromBrief(text);
        if (title && title.length >= 4) {
          await db.update(sessions).set({ title, titleLocked: true, updatedAt: new Date() })
            .where(eq(sessions.id, b.sessionId));
          await publish(`session:${b.sessionId}`, { type: "session", title });
        }
      } catch (e) {
        console.error("[callback] suggestTitleFromBrief failed", e);
      }
    }
    // generate_report: early-stop after round 2. User chose to finish early —
    // fire the final-report endpoint (same path as the round-3 auto-trigger).
    // The endpoint's once-guard prevents double generation.
    const reportOp = phaseOps.find(o => o.op === "report");
    if (reportOp) {
      const baseUrl = process.env.PUBLIC_BASE_URL || "https://syn.worqshop.io";
      fetch(`${baseUrl}/api/sessions/${b.sessionId}/final-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Syn-Callback-Secret": SECRET || "" },
        body: JSON.stringify({ auto: true, earlyStop: true })
      }).catch(() => {});
    }
    const personaOps = phaseOps.filter(o => o.op !== "brief_set" && o.op !== "report");
    const proposeUrl = process.env.SYNWEB_PROPOSE_PERSONAS_WEBHOOK;
    if (proposeUrl && panelOps.length > 0) {
      // NEW: Syn provided exact personas in a structured block -> store verbatim, no Haiku re-parse.
      (async () => {
        for (const op of panelOps) {
          let payload: Record<string, unknown> = { sessionId: b.sessionId };
          if (op.op === "set") payload = { ...payload, op: "set", personas: op.personas };
          else if (op.op === "upsert") payload = { ...payload, op: "update", personaId: String((op.persona["persona_id"] ?? op.persona["personaId"] ?? "")).toLowerCase(), persona: op.persona };
          else if (op.op === "delete") payload = { ...payload, op: "remove", personaId: op.personaId };
          try { await fetch(proposeUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); } catch { /* ignore */ }
        }
      })();
    } else if (proposeUrl && personaOps.length > 0) {
      // Fire-and-forget the whole sequence — each fetch starts a new workflow
      // run; we don't block the callback response on them.
      (async () => {
        for (const op of personaOps) {
          try {
            await fetch(proposeUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: b.sessionId,
                content: text,          // already stripped of markers
                op: op.op,
                personaId: op.personaId ?? null
              })
            });
          } catch { /* ignore per-op failures, others continue */ }
        }
      })();
    }
  }
  return NextResponse.json({ ok: true });
}


const HOOK = process.env.SYNWEB_GATEWAY_WEBHOOK!;

export async function forwardToGateway(payload: {
  sessionId: string;
  userId: string;
  cleanMessage: string;
  targetPersona?: number | null;
  hasFiles?: boolean;
}) {
  const body = {
    sessionId: payload.sessionId,
    userId: payload.userId,
    cleanMessage: payload.cleanMessage,
    targetPersona: payload.targetPersona != null ? String(payload.targetPersona) : "",
    hasFiles: !!payload.hasFiles
  };
  const res = await fetch(HOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`n8n gateway responded ${res.status}`);
  }
  const raw = await res.text();
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return { raw }; }
}

const READSTATE = process.env.SYNWEB_READSTATE_WEBHOOK!;

export type PanelPersona = {
  session_id: string;
  persona_id: string;
  name?: string;
  type?: string;
  core_perspective?: string;
  profile?: string;
  position_summary?: string;
  round_1_response?: string;
  round_2_response?: string;
  round_3_response?: string;
  slack_slot?: number;
};

export type PanelSynthesis = {
  session_id: string;
  round_number: number;
  synthesis_text: string;
};

export async function readState(sessionId: string): Promise<{
  personas: PanelPersona[];
  syntheses: PanelSynthesis[];
}> {
  const res = await fetch(READSTATE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`readstate ${res.status}`);
  const data = await res.json();
  return {
    personas: data.personas ?? [],
    syntheses: data.syntheses ?? []
  };
}

const INGEST = process.env.SYNWEB_INGEST_WEBHOOK!;

export async function ingestFile(payload: {
  sessionId: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  fileUrl: string;
  uploadOrder: number;
}) {
  const res = await fetch(INGEST, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`ingest ${res.status}`);
  return await res.json().catch(() => ({}));
}

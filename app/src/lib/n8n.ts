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
  return await res.json();
}

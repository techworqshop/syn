const HOOK = process.env.SYNWEB_GATEWAY_WEBHOOK!;

export async function forwardToGateway(payload: {
  sessionId: string;
  userId: string;
  cleanMessage: string;
  targetPersona?: number | null;
  hasFiles?: boolean;
}) {
  const callbackBase = process.env.APP_PUBLIC_BASE || process.env.PUBLIC_BASE_URL || "https://syn.worqshop.io";
  const body = {
    sessionId: payload.sessionId,
    userId: payload.userId,
    cleanMessage: payload.cleanMessage,
    targetPersona: payload.targetPersona != null ? String(payload.targetPersona) : "",
    hasFiles: !!payload.hasFiles,
    // Stack-aware Callback-URL — Gateway forwarded das zu allen Sub-Workflows.
    callbackUrl: `${callbackBase}/api/n8n/callback`
  };
  // n8n's responseNode mode keeps the upstream connection open while the
  // workflow keeps running (~several minutes). Caddy buffers the body,
  // undici hits its 300s bodyTimeout, and we see "fetch failed" even
  // though Respond OK already fired in milliseconds. Hard-cap the call
  // at 15s and don't bother reading the body — we only need the 200.
  // Retry-Logic: bei 502/503/504/network-EOF einmal nach 1s wiederholen.
  // Schuetzt vor transienten Issues z.B. nach n8n-Restart wo Caddy
  // tote keepalive-connections im Pool hat.
  async function attempt(): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    try {
      return await fetch(HOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
    } finally {
      clearTimeout(timer);
    }
  }
  const isTransient = (status: number) => [502, 503, 504].includes(status);
  let res: Response;
  try {
    res = await attempt();
    if (isTransient(res.status)) {
      console.warn(`[gateway] transient ${res.status} — retrying in 1s`);
      await new Promise(r => setTimeout(r, 1000));
      res = await attempt();
    }
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      // Webhook accepted but Respond OK delayed by Caddy buffering — workflow runs.
      return {};
    }
    // Network-level error (EOF, ECONNRESET, etc.) — retry once
    console.warn(`[gateway] network error — retrying in 1s`, e instanceof Error ? e.message : e);
    await new Promise(r => setTimeout(r, 1000));
    try {
      res = await attempt();
    } catch (e2) {
      if (e2 instanceof Error && e2.name === "AbortError") return {};
      throw e2;
    }
  }
  if (!res.ok) {
    throw new Error(`n8n gateway responded ${res.status}`);
  }
  return {};
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
  round_number: number | null;
  synthesis_text: string | null;
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

const DELFILE = process.env.SYNWEB_DELETEFILE_WEBHOOK!;

export async function deleteFileFromPanel(fileId: string) {
  try {
    await fetch(DELFILE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId })
    });
  } catch {}
}

const INVITE_HOOK = process.env.SYNWEB_INVITE_WEBHOOK!;

export async function sendInviteEmail(payload: {
  recipientEmail: string;
  inviterName: string;
  inviteUrl: string;
}) {
  if (!INVITE_HOOK) return false;
  try {
    const res = await fetch(INVITE_HOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch { return false; }
}

// Password-Reset-Mail via n8n. Falls Hook nicht konfiguriert: false zurueck,
// die Action loggt den Reset-Link dann nur in console (Test-Modus).
const PWD_RESET_HOOK = process.env.SYNWEB_PASSWORD_RESET_WEBHOOK || "";

export async function sendPasswordResetEmail(payload: {
  recipientEmail: string;
  resetUrl: string;
}) {
  if (!PWD_RESET_HOOK) return false;
  try {
    const res = await fetch(PWD_RESET_HOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch { return false; }
}

// Email-Verification-Mail via n8n. Wie oben: ohne Hook nur Log.
const VERIFY_HOOK = process.env.SYNWEB_VERIFY_EMAIL_WEBHOOK || "";

export async function sendVerificationEmail(payload: {
  recipientEmail: string;
  verifyUrl: string;
}) {
  if (!VERIFY_HOOK) return false;
  try {
    const res = await fetch(VERIFY_HOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch { return false; }
}

// Email-Change-Confirm-Mail via n8n. Geht an die NEUE Adresse (nicht die alte).
const EMAIL_CHANGE_HOOK = process.env.SYNWEB_EMAIL_CHANGE_WEBHOOK || "";

export async function sendEmailChangeEmail(payload: {
  recipientEmail: string;
  confirmUrl: string;
  oldEmail: string;
}) {
  if (!EMAIL_CHANGE_HOOK) return false;
  try {
    const res = await fetch(EMAIL_CHANGE_HOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch { return false; }
}

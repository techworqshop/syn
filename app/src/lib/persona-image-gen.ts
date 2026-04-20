import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { personaImages } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

const KEY = process.env.GOOGLE_AI_API_KEY!;
const MODEL = "gemini-2.5-flash-image";
const DIR_BASE = "/app/uploads/personas";
export const MAX_ATTEMPTS = 3;

export type PersonaInput = {
  sessionId: string;
  slot: number;
  name: string;
  type?: string;
  profile?: string;
};

function buildPrompt(p: PersonaInput): string {
  const role = (p.type && p.type.toLowerCase() !== "human")
    ? p.type
    : "professional";
  return `Editorial headshot portrait photograph of a professional in the role: ${role}. Natural soft lighting, neutral uncluttered background, subject looking slightly off-camera with a thoughtful expression, realistic skin tones, warm editorial color grading, shallow depth of field. Square 1:1 framing, head and upper shoulders visible. No text, no logos, no watermarks.`;
}

async function callGemini(prompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
  };
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (e) {
    return { ok: false as const, err: `fetch error: ${(e as Error).message}` };
  }
  if (!res.ok) return { ok: false as const, err: `HTTP ${res.status}` };
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const inline = parts.find((x: { inlineData?: unknown }) => !!x.inlineData)?.inlineData;
  if (!inline) {
    const fin = data?.candidates?.[0]?.finishReason || "unknown";
    return { ok: false as const, err: `no image (finish=${fin})` };
  }
  return { ok: true as const, bytes: Buffer.from(inline.data, "base64"), mime: inline.mimeType || "image/png" };
}

export async function generatePersonaImage(p: PersonaInput): Promise<"ready" | "failed" | "exhausted"> {
  if (!KEY) {
    console.error("[persona-image] GOOGLE_AI_API_KEY missing");
    return "failed";
  }
  const existing = await db.select().from(personaImages)
    .where(and(eq(personaImages.sessionId, p.sessionId), eq(personaImages.slot, p.slot)))
    .limit(1);
  const row = existing[0];
  if (row?.status === "ready") return "ready";
  if (row && row.attempts >= MAX_ATTEMPTS) return "exhausted";

  if (!row) {
    await db.insert(personaImages).values({
      sessionId: p.sessionId, slot: p.slot, status: "pending", attempts: 0
    });
  }
  const result = await callGemini(buildPrompt(p));
  if (!result.ok) {
    await db.update(personaImages).set({
      status: "failed",
      attempts: sql`attempts + 1`,
      lastError: result.err.slice(0, 500)
    }).where(and(eq(personaImages.sessionId, p.sessionId), eq(personaImages.slot, p.slot)));
    console.warn(`[persona-image] session=${p.sessionId} slot=${p.slot} failed: ${result.err}`);
    return "failed";
  }

  const ext = result.mime.includes("jpeg") ? "jpg" : "png";
  const dir = path.join(DIR_BASE, p.sessionId);
  await fs.mkdir(dir, { recursive: true });
  const target = path.join(dir, `slot-${p.slot}.${ext}`);
  await fs.writeFile(target, result.bytes);
  await db.update(personaImages).set({
    storagePath: target,
    mimeType: result.mime,
    status: "ready",
    attempts: sql`attempts + 1`,
    lastError: null
  }).where(and(eq(personaImages.sessionId, p.sessionId), eq(personaImages.slot, p.slot)));
  console.log(`[persona-image] session=${p.sessionId} slot=${p.slot} ready (${result.bytes.length}b)`);
  return "ready";
}

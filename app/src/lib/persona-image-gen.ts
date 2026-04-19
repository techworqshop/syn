import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { personaImages } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const KEY = process.env.GOOGLE_AI_API_KEY!;
const MODEL = "gemini-2.5-flash-image";
const DIR_BASE = "/app/uploads/personas";

export type PersonaInput = {
  sessionId: string;
  slot: number;
  name: string;
  type?: string;
  profile?: string;
};

function buildPrompt(p: PersonaInput): string {
  return `Professional portrait photograph of ${p.name}, ${p.type || "professional"}. Background context: ${(p.profile || "").slice(0,300)}.

STYLE: Natural soft lighting, neutral uncluttered background, looking slightly off-camera with a thoughtful expression, realistic skin tones, warm editorial color grading, shallow depth of field, editorial headshot quality. Square 1:1 framing, head and upper shoulders visible. No text, no logos, no watermarks, no captions.`;
}

export async function generatePersonaImage(p: PersonaInput): Promise<string | null> {
  if (!KEY) return null;
  // skip if already exists
  const existing = await db.select().from(personaImages)
    .where(and(eq(personaImages.sessionId, p.sessionId), eq(personaImages.slot, p.slot))).limit(1);
  if (existing.length) return existing[0].storagePath;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  const body = {
    contents: [{ parts: [{ text: buildPrompt(p) }] }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) return null;
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const inline = parts.find((x: { inlineData?: unknown }) => !!x.inlineData)?.inlineData;
    if (!inline) return null;
    const ext = (inline.mimeType || "image/png").includes("jpeg") ? "jpg" : "png";
    const dir = path.join(DIR_BASE, p.sessionId);
    await fs.mkdir(dir, { recursive: true });
    const target = path.join(dir, `slot-${p.slot}.${ext}`);
    await fs.writeFile(target, Buffer.from(inline.data, "base64"));
    await db.insert(personaImages).values({
      sessionId: p.sessionId, slot: p.slot, storagePath: target,
      mimeType: inline.mimeType || "image/png", status: "ready"
    });
    return target;
  } catch { return null; }
}

// Generates 5 diverse persona portraits for the Syn landing page.
// Reuses the same Gemini 2.5 Flash Image endpoint as the app.
// Outputs to /app/uploads/_admin/landing/persona-{slug}.png
import fs from "node:fs";
import path from "node:path";

const KEY = process.env.GOOGLE_AI_API_KEY;
if (!KEY) { console.error("GOOGLE_AI_API_KEY missing"); process.exit(1); }

const OUT = "/app/uploads/_admin/landing";
const MODEL = "gemini-2.5-flash-image";

const PERSONAS = [
  { slug: "maya",   role: "skeptical CMO",
    desc: "a Latina woman in her late thirties with dark wavy shoulder-length hair, warm olive skin, confident analytical expression, tailored dark blazer over cream blouse" },
  { slug: "jonas",  role: "early-adopter product manager",
    desc: "a white Swiss-European man in his early thirties with short light-brown hair, friendly thoughtful expression, casual heather-grey crewneck sweater" },
  { slug: "noor",   role: "head of budget and finance",
    desc: "a Middle Eastern woman in her early forties with dark hair in a low bun, calm intelligent expression, elegant deep-blue blazer" }
  ,
  { slug: "adrian", role: "career-switcher in tech",
    desc: "a Black British man in his mid thirties with short dark hair and a trimmed beard, creative curious expression, layered earth-tone open shirt over a t-shirt" },
  { slug: "lia",    role: "everyday user in the target audience",
    desc: "an East Asian woman in her late twenties with shoulder-length dark hair, warm approachable smile, simple cream-colored knit top" }
];

function buildPrompt(desc, role) {
  return `Editorial headshot portrait photograph of ${desc}. The subject works as ${role}. Natural soft lighting, neutral uncluttered background in warm cream tone, subject looking slightly off-camera with a thoughtful expression, realistic skin tones, warm editorial color grading, shallow depth of field. Square 1:1 framing, head and upper shoulders visible. No text, no logos, no watermarks.`;
}

async function gen(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  const body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } };
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const inline = parts.find(x => !!x.inlineData)?.inlineData;
  if (!inline) throw new Error(`no image (finish=${data?.candidates?.[0]?.finishReason || "?"})`);
  return Buffer.from(inline.data, "base64");
}

for (const p of PERSONAS) {
  const outPath = path.join(OUT, `persona-${p.slug}.png`);
  if (fs.existsSync(outPath) && !process.env.FORCE) {
    console.log(`[skip] ${p.slug} (exists; set FORCE=1 to regenerate)`);
    continue;
  }
  process.stdout.write(`[gen] ${p.slug} ... `);
  try {
    const bytes = await gen(buildPrompt(p.desc, p.role));
    fs.writeFileSync(outPath, bytes);
    console.log(`OK (${bytes.length} bytes -> ${outPath})`);
  } catch (e) {
    console.log(`FAIL: ${e.message}`);
  }
}
console.log("done.");

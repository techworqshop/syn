const MODEL = "gemini-2.5-flash";
const KEY = process.env.GOOGLE_AI_API_KEY!;

export async function suggestTitle(problemBrief: string | null, firstUserMessages: string[]): Promise<string | null> {
  if (!KEY) return null;
  const ctx = (problemBrief || firstUserMessages.slice(0, 3).join("\n")).slice(0, 1200);
  if (!ctx.trim()) return null;
  const prompt = `Erstelle einen praegnanten, neutralen Titel (max 45 Zeichen, kein Markdown, keine Anfuehrungszeichen) fuer eine Fokusgruppen-Diskussion zu folgendem Thema. Antworte NUR mit dem Titel, nichts sonst:\n\n${ctx}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return null;
    return text.replace(/^["'\s]+|["'\s]+$/g, "").slice(0, 80);
  } catch { return null; }
}

// Brief-aware title generation. Triggered by the <!-- syn:phase=brief_proposed -->
// marker in the coordinator's brief-proposal message. Sees the full brief (up to
// 4000 chars) instead of just user one-liners — produces much more precise titles
// like "awe — Erster Eindruck Outdoor-Brand" instead of generic "Fokusgruppe Go - Impulse".
export async function suggestTitleFromBrief(briefText: string): Promise<string | null> {
  if (!KEY) return null;
  const ctx = (briefText || "").slice(0, 4000);
  if (!ctx.trim()) return null;
  const prompt = `Du bekommst einen Problem-Brief fuer eine Fokusgruppen-Diskussion. Erstelle einen praezisen, neutralen Titel der das KERN-THEMA in max 50 Zeichen erfasst.

Regeln:
- Konkrete Marken/Produkte/Themen explizit nennen wenn vorhanden (z.B. "awe" statt "Outdoor-Marke")
- KEIN Marketing-Sprech, kein "Diskussion ueber", kein "Analyse von"
- KEINE Anfuehrungszeichen, kein Markdown
- Bei Brand-Reviews: Brand-Name + Fokus (z.B. "awe - Erster Eindruck Outdoor-Brand")
- Bei abstrakten Themen: konkretes Kernverb + Substantiv (z.B. "Pricing-Strategie B2B-SaaS")
- Wenn der Brief auf Englisch ist: englischer Titel

Antworte NUR mit dem Titel, sonst nichts.

PROBLEM BRIEF:
${ctx}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return null;
    return text.replace(/^["'\s]+|["'\s]+$/g, "").slice(0, 80);
  } catch { return null; }
}

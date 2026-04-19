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

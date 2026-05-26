import fs from "node:fs";
import path from "node:path";

const DIR = "/app/uploads/_admin/landing";
const ALLOWED = new Set(["products", "websites", "designs", "persona-maya", "persona-jonas", "persona-noor", "persona-adrian", "persona-lia"]);

type P = { params: Promise<{ name: string }> };

export async function GET(_: Request, { params }: P) {
  const { name } = await params;
  // Sanitize: only allow whitelisted names
  if (!ALLOWED.has(name)) return new Response("not found", { status: 404 });
  for (const ext of ["png", "jpg", "jpeg", "webp"]) {
    const p = path.join(DIR, `${name}.${ext}`);
    if (fs.existsSync(p)) {
      const buf = fs.readFileSync(p);
      return new Response(buf, {
        headers: {
          "Content-Type": `image/${ext === "jpg" ? "jpeg" : ext}`,
          "Cache-Control": "no-store, must-revalidate"
        }
      });
    }
  }
  return new Response("not found", { status: 404 });
}

import fs from "node:fs";
import path from "node:path";

const CUSTOM_DIR = "/app/uploads/_admin";

export async function GET() {
  const exts = ["png", "jpg", "jpeg", "webp"];
  for (const e of exts) {
    const p = path.join(CUSTOM_DIR, `syn-avatar.${e}`);
    if (fs.existsSync(p)) {
      const buf = fs.readFileSync(p);
      return new Response(buf, {
        headers: {
          "Content-Type": `image/${e === "jpg" ? "jpeg" : e}`,
          "Cache-Control": "private, max-age=60"
        }
      });
    }
  }
  const fallback = fs.readFileSync("/app/public/syn-avatar.svg");
  return new Response(fallback, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, max-age=60" }
  });
}

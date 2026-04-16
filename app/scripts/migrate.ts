import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: 1 });
  const dir = path.join(process.cwd(), "drizzle");
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".sql")).sort();
  for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), "utf8");
    console.log(`Applying ${f} ...`);
    await sql.unsafe(content);
  }
  console.log("Migrations done.");
  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });

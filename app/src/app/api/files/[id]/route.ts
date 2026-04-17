import fs from "node:fs";
import { db } from "@/lib/db";
import { files } from "@/db/schema";
import { eq } from "drizzle-orm";

type P = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: P) {
  const { id } = await params;
  const [row] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  if (!row) return new Response("not found", { status: 404 });
  if (!fs.existsSync(row.storagePath)) return new Response("gone", { status: 410 });
  const stream = fs.createReadStream(row.storagePath);
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": row.mimeType,
      "Content-Length": String(row.sizeBytes),
      "Content-Disposition": `inline; filename="${encodeURIComponent(row.fileName)}"`,
      "Cache-Control": "private, max-age=3600"
    }
  });
}

import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { sessions, files } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { ingestFile } from "@/lib/n8n";
import { and, eq } from "drizzle-orm";

type P = { params: Promise<{ id: string }> };
const BASE = process.env.PUBLIC_BASE_URL!;
const UPLOADS = "/app/uploads";

export async function POST(req: Request, { params }: P) {
  const u = await requireUser();
  const { id } = await params;
  const [sess] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id))).limit(1);
  if (!sess) return NextResponse.json({ error: "not found" }, { status: 404 });
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const safeName = (file.name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  const id2 = randomUUID();
  const sessDir = path.join(UPLOADS, id);
  await fs.mkdir(sessDir, { recursive: true });
  const fpath = path.join(sessDir, `${id2}-${safeName}`);
  await fs.writeFile(fpath, buf);
  const [row] = await db.insert(files).values({
    sessionId: id,
    fileName: safeName,
    mimeType: file.type || "application/octet-stream",
    storagePath: fpath,
    sizeBytes: buf.length,
    category: (() => { const c = String(form.get("category") || "panel"); return ["briefing","persona","panel"].includes(c) ? c : "panel"; })()
  }).returning();
  const publicUrl = `${BASE}/api/files/${row.id}`;
  // count existing files for uploadOrder
  const existing = await db.select().from(files).where(eq(files.sessionId, id));
  const uploadOrder = existing.length;
  // fire-and-wait ingest (so we get summary back)
  try {
    const out = await ingestFile({
      sessionId: id, fileId: row.id, fileName: safeName,
      mimeType: row.mimeType, fileUrl: publicUrl, uploadOrder
    });
    if (out && typeof out === "object") {
      const summary = (out as { summary?: string }).summary ||
                      (Array.isArray((out as { content?: unknown[] }).content) ?
                        ((out as { content: { text?: string }[] }).content[0]?.text ?? "") : "");
      if (summary) {
        await db.update(files).set({ summary: String(summary).slice(0,2000) })
          .where(eq(files.id, row.id));
      }
    }
  } catch {}
  return NextResponse.json({ file: { ...row, publicUrl } });
}

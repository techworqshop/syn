import fs from "node:fs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { files, sessions } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { deleteFileFromPanel } from "@/lib/n8n";
import { and, eq } from "drizzle-orm";

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
      "Cache-Control": "private, max-age=3600"
    }
  });
}

export async function DELETE(_: Request, { params }: P) {
  const u = await requireUser();
  const { id } = await params;
  const [row] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [sess] = await db.select().from(sessions)
    .where(and(eq(sessions.id, row.sessionId), eq(sessions.userId, u.id))).limit(1);
  if (!sess) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  try { if (fs.existsSync(row.storagePath)) fs.unlinkSync(row.storagePath); } catch {}
  await db.delete(files).where(eq(files.id, id));
  await deleteFileFromPanel(id);
  return NextResponse.json({ ok: true });
}

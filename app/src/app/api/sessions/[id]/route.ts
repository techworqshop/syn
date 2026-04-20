import { NextResponse } from "next/server";
import fs from "node:fs";
import { files, messages, audienceMessages, syntheses, personaImages } from "@/db/schema";
import { deleteFileFromPanel } from "@/lib/n8n";
import { db } from "@/lib/db";
import { sessions } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { and, eq } from "drizzle-orm";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const [row] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id))).limit(1);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ session: row });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : null;
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const [row] = await db.update(sessions)
    .set({ title, titleLocked: true, updatedAt: new Date() })
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id)))
    .returning();
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ session: row });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const [sess] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id))).limit(1);
  if (!sess) return NextResponse.json({ error: "not found" }, { status: 404 });
  const sessionFiles = await db.select().from(files).where(eq(files.sessionId, id));
  for (const f of sessionFiles) {
    try { if (fs.existsSync(f.storagePath)) fs.unlinkSync(f.storagePath); } catch {}
    try { await deleteFileFromPanel(f.id); } catch {}
  }
  await db.delete(sessions).where(eq(sessions.id, id));
  // Remove on-disk artifacts for this session
  for (const dir of [`/app/uploads/${id}`, `/app/uploads/personas/${id}`, `/app/uploads/reports/${id}`]) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
  return NextResponse.json({ ok: true });
}

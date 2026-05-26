import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { sessions, files } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
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

  // Upload-Disable ab Runde 1: sobald die Diskussion laeuft, kein neues
  // Material mehr (Anti-Cheat + Kontext-Konsistenz).
  if ((sess.currentRound ?? 0) >= 1) {
    return NextResponse.json({
      error: "Uploads sind ab Runde 1 deaktiviert. Das Panel arbeitet mit dem Material, das vor Diskussionsstart hochgeladen wurde.",
      code: "uploads_locked"
    }, { status: 423 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

  // Hard limit: max 5 files per session. Token-Budget-Schutz — jedes File geht
  // durch jeden Persona-Lauf via Ask Vision. 11 Files x 5 Personas x 3 Runden
  // = 165 Vision-Calls. 5 Files reichen fuer fast jeden Use-Case.
  const MAX_FILES_PER_SESSION = 5;
  const existingFiles = await db.select({ id: files.id }).from(files).where(eq(files.sessionId, id));
  if (existingFiles.length >= MAX_FILES_PER_SESSION) {
    return NextResponse.json({
      error: `Maximal ${MAX_FILES_PER_SESSION} Dateien pro Session erlaubt. Loesche eine bestehende Datei, um eine neue hochzuladen.`,
      code: "file_limit_reached",
      limit: MAX_FILES_PER_SESSION,
      current: existingFiles.length
    }, { status: 400 });
  }

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
  
  return NextResponse.json({ file: { ...row, publicUrl } });
}

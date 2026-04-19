import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { requireUser } from "@/lib/current-user";

const CUSTOM_DIR = "/app/uploads/_admin";

export async function POST(req: Request) {
  await requireUser();
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });
  await fs.mkdir(CUSTOM_DIR, { recursive: true });
  for (const ext of ["png","jpg","jpeg","webp"]) {
    const p = path.join(CUSTOM_DIR, `syn-avatar.${ext}`);
    if (fsSync.existsSync(p)) await fs.unlink(p);
  }
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const target = path.join(CUSTOM_DIR, `syn-avatar.${ext}`);
  await fs.writeFile(target, Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await requireUser();
  for (const ext of ["png","jpg","jpeg","webp"]) {
    const p = path.join(CUSTOM_DIR, `syn-avatar.${ext}`);
    if (fsSync.existsSync(p)) await fs.unlink(p);
  }
  return NextResponse.json({ ok: true });
}

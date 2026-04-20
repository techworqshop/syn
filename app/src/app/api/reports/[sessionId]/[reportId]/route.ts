import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { sessions, messages } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { and, eq } from "drizzle-orm";

type P = { params: Promise<{ sessionId: string; reportId: string }> };

const REPORTS_DIR = "/app/uploads/reports";

export async function GET(_: Request, { params }: P) {
  const u = await requireUser();
  const { sessionId, reportId } = await params;

  if (!/^[a-f0-9-]+$/i.test(reportId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const [sess] = await db.select().from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, u.id))).limit(1);
  if (!sess) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Find the message that announced this report so we can pick up filename
  const allMsgs = await db.select().from(messages).where(eq(messages.sessionId, sessionId));
  const reportMsg = allMsgs.find(m => {
    const md = m.metadata as { kind?: string; reportId?: string; filename?: string } | null;
    return md && md.kind === "report" && md.reportId === reportId;
  });
  if (!reportMsg) {
    return NextResponse.json({ error: "report not found" }, { status: 404 });
  }
  const md = reportMsg.metadata as { filename?: string };
  const filename = md.filename || `syn-bericht-${reportId}.pdf`;

  const target = path.join(REPORTS_DIR, sessionId, `${reportId}.pdf`);
  let buf: Buffer;
  try { buf = await fs.readFile(target); }
  catch { return NextResponse.json({ error: "file missing" }, { status: 410 }); }

  return new Response(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}

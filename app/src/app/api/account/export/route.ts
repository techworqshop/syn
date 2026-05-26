import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, sessions, messages, audienceMessages, files, subscriptions, sessionConsumptions, purchasedExtras } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  let u;
  try { u = await requireUser(); }
  catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }

  const [profile] = await db.select({
    id: users.id, email: users.email, name: users.name,
    createdAt: users.createdAt
  }).from(users).where(eq(users.id, u.id)).limit(1);
  const sess = await db.select().from(sessions).where(eq(sessions.userId, u.id));
  const sessIds = sess.map(s => s.id);
  const msgs = sessIds.length ? await db.select().from(messages).where(eq(messages.sessionId, sessIds[0])).then(async (m) => {
    const all = [...m];
    for (let i = 1; i < sessIds.length; i++) {
      all.push(...(await db.select().from(messages).where(eq(messages.sessionId, sessIds[i]))));
    }
    return all;
  }) : [];

  const audMsgs = [];
  for (const sid of sessIds) {
    audMsgs.push(...(await db.select().from(audienceMessages).where(eq(audienceMessages.sessionId, sid))));
  }
  const fileRows = [];
  for (const sid of sessIds) {
    fileRows.push(...(await db.select().from(files).where(eq(files.sessionId, sid))));
  }
  const subs = await db.select().from(subscriptions).where(eq(subscriptions.userId, u.id));
  const cons = await db.select().from(sessionConsumptions).where(eq(sessionConsumptions.userId, u.id));
  const extras = await db.select().from(purchasedExtras).where(eq(purchasedExtras.userId, u.id));

  const payload = {
    generated_at: new Date().toISOString(),
    profile,
    sessions: sess,
    messages: msgs,
    audience_messages: audMsgs,
    files: fileRows,
    subscriptions: subs,
    session_consumptions: cons,
    purchased_extras: extras
  };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="syn-export-${u.id.slice(0,8)}-${Date.now()}.json"`
    }
  });
}

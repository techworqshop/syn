import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sessions, messages } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { and, eq, asc } from "drizzle-orm";
import ChatApp from "@/components/ChatApp";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ id: string }> };

export default async function SessionPage({ params }: P) {
  const u = await requireUser();
  const { id } = await params;
  const [sess] = await db.select().from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, u.id))).limit(1);
  if (!sess) return notFound();
  const msgs = await db.select().from(messages)
    .where(eq(messages.sessionId, id)).orderBy(asc(messages.createdAt));
  return <ChatApp sessionId={id} session={sess} initialMessages={msgs} />;
}

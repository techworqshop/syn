import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sessions, messages } from "@/db/schema";
import { readState } from "@/lib/n8n";
import { eq, asc } from "drizzle-orm";
import MessageBubble from "@/components/MessageBubble";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ token: string }> };

export default async function SharePage({ params }: P) {
  const { token } = await params;
  const [sess] = await db.select().from(sessions)
    .where(eq(sessions.shareToken, token)).limit(1);
  if (!sess) return notFound();
  const msgs = await db.select().from(messages)
    .where(eq(messages.sessionId, sess.id)).orderBy(asc(messages.createdAt));
  const state = await readState(sess.id).catch(() => ({ personas: [], syntheses: [] }));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass border-b border-white/5 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <img src="/api/assets/syn-avatar" alt="" className="w-9 h-9 rounded-xl ring-1 ring-white/10" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold tracking-tight truncate">{sess.title}</div>
            <div className="text-xs text-neutral-500">Geteilte Fokusgruppe - Read only</div>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-4">
          {msgs.map(m => <MessageBubble key={m.id} m={m} />)}
          {msgs.length === 0 && (
            <div className="text-center text-neutral-500 py-12">Noch keine Nachrichten.</div>
          )}
        </div>
      </main>
    </div>
  );
}

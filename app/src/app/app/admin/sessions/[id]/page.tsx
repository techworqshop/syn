import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sessions, users, messages, files } from "@/db/schema";
import { requireAdmin } from "@/lib/current-user";
import { eq, asc } from "drizzle-orm";
import MessageBubble from "@/components/MessageBubble";
import AdminError from "@/components/admin/AdminError";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ id: string }> };

export default async function AdminSessionDetailPage({ params }: P) {
  await requireAdmin();
  const { id } = await params;
  try {
    const [sess] = await db
      .select({
        id: sessions.id,
        title: sessions.title,
        problemBrief: sessions.problemBrief,
        status: sessions.status,
        currentRound: sessions.currentRound,
        personaCount: sessions.personaCount,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        userId: sessions.userId,
        userEmail: users.email,
        userName: users.name
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.id, id))
      .limit(1);
    if (!sess) return notFound();

    const [msgs, sessionFiles] = await Promise.all([
      db.select().from(messages).where(eq(messages.sessionId, id)).orderBy(asc(messages.createdAt)),
      db.select().from(files).where(eq(files.sessionId, id)).orderBy(asc(files.createdAt))
    ]);

    const closed = sess.currentRound >= 3;
    return (
      <div className="max-w-6xl mx-auto w-full p-6">
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <Link href="/app/admin/sessions" className="text-sm text-stone-600 hover:text-stone-900 font-medium">← Alle Sessions</Link>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 text-[10px] uppercase tracking-wide font-bold">
            Admin-Read-Only
          </span>
        </div>

        <div className="rounded-2xl border border-stone-300 bg-[#F3EFE2] p-5 shadow-sm mb-6">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{sess.title}</h1>
            {closed && (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full font-bold text-white"
                style={{ background: "linear-gradient(180deg, #4C1D95, #BE123C)" }}>Abgeschlossen</span>
            )}
          </div>
          <div className="text-sm text-stone-600 mt-1">
            Owner: <Link href={`/app/admin/users/${sess.userId}`} className="font-medium text-stone-800 hover:text-rose-800">{sess.userName || sess.userEmail}</Link>
            {" · "}Runde {sess.currentRound} · {sess.personaCount} Personas · {sessionFiles.length} Dateien
            {" · "}Erstellt {new Date(sess.createdAt).toLocaleString("de-DE")} · Aktualisiert {new Date(sess.updatedAt).toLocaleString("de-DE")}
          </div>
          {sess.problemBrief && (
            <details className="mt-3">
              <summary className="text-xs uppercase tracking-wide text-stone-600 font-bold cursor-pointer hover:text-stone-900">Problem Brief</summary>
              <div className="mt-2 text-sm text-stone-800 whitespace-pre-wrap bg-white/50 rounded-lg p-3 border border-stone-200">{sess.problemBrief}</div>
            </details>
          )}
        </div>

        {sessionFiles.length > 0 && (
          <div className="mb-6">
            <div className="text-xs uppercase tracking-wide text-stone-700 font-bold mb-2">Dateien</div>
            <div className="flex flex-wrap gap-2">
              {sessionFiles.map(f => {
                const cls =
                  f.category === "briefing" ? "bg-yellow-200 border-yellow-600 text-yellow-950"
                  : f.category === "persona" ? "bg-emerald-900/15 border-emerald-900/60 text-emerald-950"
                  : "bg-orange-200 border-orange-700 text-orange-950";
                return (
                  <a key={f.id} href={`/api/files/${f.id}`} target="_blank" rel="noopener"
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium shadow-sm ${cls} hover:brightness-95`}>
                    <span className="text-[10px] uppercase tracking-wide opacity-70">{f.category === "briefing" ? "Briefing" : f.category === "persona" ? "Persona" : "Panel"}</span>
                    <span className="max-w-[260px] truncate">{f.fileName}</span>
                    <span className="opacity-60">{Math.round(f.sizeBytes / 1024)}K</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-[#F3EFE2] border border-stone-300 shadow-sm p-5">
          <div className="text-xs uppercase tracking-wide text-stone-700 font-bold mb-4">Chat-Verlauf ({msgs.length})</div>
          {msgs.length === 0 ? (
            <div className="text-sm text-stone-600 text-center py-12">Noch keine Nachrichten.</div>
          ) : (
            <div className="space-y-4">
              {msgs.map(m => <MessageBubble key={m.id} m={m} />)}
            </div>
          )}
        </div>
      </div>
    );
  } catch (e) {
    console.error("[admin/sessions/[id]] failed", e);
    return <AdminError where="Session-Detail" error={e} />;
  }
}

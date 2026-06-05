import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sessions, messages, files } from "@/db/schema";
import { readState } from "@/lib/n8n";
import { eq, asc } from "drizzle-orm";
import MessageBubble from "@/components/MessageBubble";
import LanguageSwitch from "@/components/LanguageSwitch";
import { getLocaleFromCookies, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type P = { params: Promise<{ token: string }> };

export default async function SharePage({ params }: P) {
  const { token } = await params;
  const locale = await getLocaleFromCookies();
  const [sess] = await db.select().from(sessions)
    .where(eq(sessions.shareToken, token)).limit(1);
  if (!sess) return notFound();
  const msgs = await db.select().from(messages)
    .where(eq(messages.sessionId, sess.id)).orderBy(asc(messages.createdAt));
  const sessionFiles = await db.select().from(files)
    .where(eq(files.sessionId, sess.id)).orderBy(asc(files.createdAt));
  await readState(sess.id).catch(() => ({ personas: [], syntheses: [] }));

  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass border-b border-stone-200 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <img src="/api/assets/syn-avatar" alt="" className="w-9 h-9 rounded-full ring-1 ring-white/10 object-cover" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold tracking-tight truncate">{sess.title}</div>
            <div className="text-xs text-stone-500">{t("share.subtitle", locale)}</div>
          </div>
          <LanguageSwitch locale={locale} />
          <a href={`/share/${token}/pdf`} download
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-gradient-to-r from-purple-900 to-rose-700 text-white text-sm font-semibold shadow-md hover:from-purple-950 hover:to-rose-800 transition-colors shrink-0"
            title={t("share.pdf", locale)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{t("share.pdf", locale)}</span>
          </a>
          <a href={`/share/${token}/transcript`} download
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-stone-400/70 bg-white/70 text-stone-700 text-sm font-semibold hover:bg-stone-100 hover:text-stone-900 transition-colors shrink-0"
            title={t("share.md", locale)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>.md</span>
          </a>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-4">
          {sessionFiles.length > 0 && (
            <section className="rounded-md border border-stone-400/40 bg-stone-50 p-4 mb-2 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-amber-800 font-bold mb-3">{t("share.files", locale)} ({sessionFiles.length})</div>
              <ul className="space-y-2">
                {sessionFiles.map(f => {
                  const catLabel = f.category === "briefing" ? t("share.cat.briefing", locale) : f.category === "persona" ? t("share.cat.persona", locale) : t("share.cat.panel", locale);
                  const catTone = f.category === "briefing"
                    ? "bg-yellow-200 text-yellow-950 border-yellow-700"
                    : f.category === "persona"
                      ? "bg-emerald-900/15 text-emerald-950 border-emerald-900/60"
                      : "bg-orange-200 text-orange-950 border-orange-700";
                  const kb = Math.round(f.sizeBytes / 1024);
                  const sizeLabel = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
                  return (
                    <li key={f.id}>
                      <a href={`/api/files/${f.id}`} target="_blank" rel="noopener"
                        className="flex items-center gap-3 p-2.5 rounded-md border border-stone-300 bg-white hover:bg-amber-50 hover:border-amber-700/50 transition-colors">
                        <span className="w-9 h-9 rounded-md bg-gradient-to-br from-amber-700 via-orange-700 to-red-800 flex items-center justify-center text-white shrink-0">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-stone-900 truncate">{f.fileName}</div>
                          <div className="text-xs text-stone-700 font-medium">{sizeLabel}</div>
                        </div>
                        <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full border font-bold ${catTone}`}>{catLabel}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {msgs.map(m => <MessageBubble key={m.id} m={m} />)}
          {msgs.length === 0 && (
            <div className="text-center text-stone-500 py-12">{t("share.empty", locale)}</div>
          )}
        </div>
      </main>
    </div>
  );
}

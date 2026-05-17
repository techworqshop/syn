import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sessions, messages } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { eq, desc, inArray, and, sql } from "drizzle-orm";
import SessionCard from "@/components/SessionCard";
import { getLocaleFromCookies, t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

async function createSession() {
  "use server";
  const u = await requireUser();
  const [row] = await db.insert(sessions).values({ userId: u.id }).returning();
  redirect(`/app/sessions/${row.id}`);
}

export default async function Dashboard() {
  const u = await requireUser();
  const locale = await getLocaleFromCookies();
  const rows = await db.select().from(sessions)
    .where(eq(sessions.userId, u.id))
    .orderBy(desc(sessions.updatedAt));
  const ids = rows.map(r => r.id);
  const reportRows = ids.length
    ? await db.select({ sessionId: messages.sessionId }).from(messages)
        .where(and(
          inArray(messages.sessionId, ids),
          sql`(${messages.metadata}->>'kind') IN ('report','report_text')`
        ))
    : [];
  const closedIds = new Set(reportRows.map(r => r.sessionId));
  return (
    <div className="max-w-5xl mx-auto w-full p-6">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("dashboard.title", locale)}</h1>
          <p className="text-sm text-stone-500 mt-1">
            {t("dashboard.subtitle", locale)}
          </p>
        </div>
        <form action={createSession}>
          <button className="btn-primary px-5 py-2.5 rounded-xl font-medium text-sm">
            {t("dashboard.new", locale)}
          </button>
        </form>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 glass p-12 text-center">
          <img src="/api/assets/syn-avatar" alt="" className="w-14 h-14 mx-auto mb-4 rounded-full" />
          <div className="text-stone-700 mb-1">{t("dashboard.empty.title", locale)}</div>
          <div className="text-sm text-stone-500">{t("dashboard.empty.cta", locale)}</div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map(s => <SessionCard key={s.id} s={s} closed={closedIds.has(s.id) || s.currentRound >= 3} locale={locale} />)}
        </div>
      )}
    </div>
  );
}

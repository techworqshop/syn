import { db } from "@/lib/db";
import { sessions } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { and, eq, isNotNull, desc } from "drizzle-orm";
import { getLocaleFromCookies, type Locale } from "@/lib/i18n";
import Link from "next/link";
import ArchiveActions from "./ArchiveActions";

export const dynamic = "force-dynamic";

function daysLeft(archivedAt: Date | null): number {
  if (!archivedAt) return 0;
  const end = new Date(archivedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default async function ArchivePage() {
  const u = await requireUser();
  const locale = await getLocaleFromCookies();
  const rows = await db.select().from(sessions)
    .where(and(eq(sessions.userId, u.id), isNotNull(sessions.archivedAt)))
    .orderBy(desc(sessions.archivedAt));
  return (
    <div className="max-w-3xl mx-auto w-full p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "#1F2420" }}>
            {locale === "en" ? "Archive" : "Archiv"}
          </h1>
          <p className="text-sm mt-1.5" style={{ color: "#7A7268" }}>
            {locale === "en"
              ? "Deleted sessions remain here for 30 days, then are permanently removed."
              : "Geloeschte Sessions bleiben 30 Tage hier und werden danach endgueltig entfernt."}
          </p>
        </div>
        <Link href="/app/dashboard" className="text-sm text-stone-600 hover:text-stone-900">
          {locale === "en" ? "Back to dashboard" : "Zurueck zum Dashboard"}
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-stone-300 bg-[#F3EFE2] px-6 py-12 text-center text-sm" style={{ color: "#7A7268" }}>
          {locale === "en" ? "Nothing in archive." : "Nichts im Archiv."}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(s => (
            <ArchiveRow key={s.id} session={s} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}

function ArchiveRow({ session, locale }: { session: typeof sessions.$inferSelect; locale: Locale }) {
  const left = daysLeft(session.archivedAt);
  const dateLocale = locale === "en" ? "en-GB" : "de-DE";
  const archivedDate = session.archivedAt ? new Date(session.archivedAt).toLocaleDateString(dateLocale, { day:"2-digit", month:"short", year:"numeric" }) : "—";
  const urgent = left <= 3;
  return (
    <div className="rounded-md border border-stone-300 bg-[#F3EFE2] px-5 py-4 flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate" style={{ color: "#1F2420" }}>{session.title}</div>
        <div className="text-xs mt-1" style={{ color: urgent ? "#9F1239" : "#7A7268" }}>
          {locale === "en"
            ? `Archived ${archivedDate} · ${left} day${left === 1 ? "" : "s"} until permanent deletion`
            : `Archiviert am ${archivedDate} · ${left} Tag${left === 1 ? "" : "e"} bis zur endgueltigen Loeschung`}
        </div>
      </div>
      <ArchiveActions sessionId={session.id} locale={locale} />
    </div>
  );
}

import { requireUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getLocaleFromCookies, t } from "@/lib/i18n";
import ProfileSection from "./ProfileSection";
import PasswordSection from "./PasswordSection";
import EmailSection from "./EmailSection";
import LanguageSection from "./LanguageSection";
import DangerZone from "./DangerZone";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const u = await requireUser();
  const locale = await getLocaleFromCookies();
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, u.id)).limit(1);
  const subActive = sub && (sub.status === "active" || sub.status === "in_trial");
  const subEndsAt = sub && sub.status === "non_renewing" && sub.currentTermEnd ? sub.currentTermEnd.toISOString() : null;
  return (
    <div className="flex-1 w-full max-w-[760px] mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight" style={{ color: "#1F2420" }}>
          {t("settings.title", locale)}
        </h1>
        <p className="text-sm mt-1.5" style={{ color: "#7A7268" }}>
          {t("settings.sub", locale)}
        </p>
      </div>

      <ProfileSection locale={locale} email={u.email} name={u.name ?? ""} />
      <EmailSection locale={locale} currentEmail={u.email} />
      <PasswordSection locale={locale} />
      <LanguageSection locale={locale} />
      <DangerZone locale={locale} email={u.email} subActive={!!subActive} subEndsAt={subEndsAt} />
    </div>
  );
}

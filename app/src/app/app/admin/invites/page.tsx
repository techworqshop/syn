import { db } from "@/lib/db";
import { invites, users } from "@/db/schema";
import { requireAdmin } from "@/lib/current-user";
import { desc, eq } from "drizzle-orm";
import InvitesClient from "./InvitesClient";
import AdminError from "@/components/admin/AdminError";

export const dynamic = "force-dynamic";

export default async function AdminInvitesPage() {
  await requireAdmin();

  try {
  const rows = await db
    .select({
      id: invites.id,
      email: invites.email,
      token: invites.token,
      usedAt: invites.usedAt,
      expiresAt: invites.expiresAt,
      createdAt: invites.createdAt,
      invitedBy: invites.invitedBy,
      inviterEmail: users.email,
      inviterName: users.name
    })
    .from(invites)
    .leftJoin(users, eq(users.id, invites.invitedBy))
    .orderBy(desc(invites.createdAt));

  const pending = rows.filter(r => !r.usedAt && new Date(r.expiresAt) >= new Date());
  const used    = rows.filter(r =>  r.usedAt);
  const expired = rows.filter(r => !r.usedAt && new Date(r.expiresAt) <  new Date());

  return (
    <div className="max-w-4xl mx-auto w-full p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Invites</h1>
        <p className="text-sm text-stone-600 mt-1">{pending.length} offen · {used.length} verbraucht · {expired.length} abgelaufen</p>
      </div>

      <InvitesClient />

      <section className="mt-8 mb-6">
        <h2 className="text-sm uppercase tracking-wide font-bold text-stone-700 mb-3">Offene Einladungen ({pending.length})</h2>
        {pending.length === 0 ? (
          <div className="rounded-2xl border border-stone-300 bg-[#F3EFE2] p-6 text-sm text-stone-600 text-center">Keine offenen Einladungen.</div>
        ) : (
          <ul className="space-y-2">
            {pending.map(i => (
              <li key={i.id} className="rounded-xl border border-stone-300 bg-[#F3EFE2] p-3 flex items-center justify-between shadow-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-stone-900 truncate">{i.email}</div>
                  <div className="text-xs text-stone-600 mt-0.5">
                    Eingeladen von {i.inviterName || i.inviterEmail || "?"} · gültig bis {new Date(i.expiresAt).toLocaleDateString("de-DE")}
                  </div>
                </div>
                <InvitesClient inviteId={i.id} token={i.token} mode="revoke" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {used.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm uppercase tracking-wide font-bold text-stone-700 mb-3">Verbraucht ({used.length})</h2>
          <ul className="space-y-1.5">
            {used.map(i => (
              <li key={i.id} className="rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm flex justify-between">
                <span className="text-stone-700 truncate">{i.email}</span>
                <span className="text-xs text-stone-500 shrink-0">eingelöst {i.usedAt ? new Date(i.usedAt).toLocaleDateString("de-DE") : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {expired.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm uppercase tracking-wide font-bold text-stone-700 mb-3">Abgelaufen ({expired.length})</h2>
          <ul className="space-y-1.5">
            {expired.map(i => (
              <li key={i.id} className="rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm flex justify-between items-center">
                <span className="text-stone-600 truncate">{i.email}</span>
                <InvitesClient inviteId={i.id} mode="revoke" subtle />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
  } catch (e) {
    console.error("[admin/invites] failed", e);
    return <AdminError where="Invites" error={e} />;
  }
}

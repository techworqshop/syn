import { requireAdmin } from "@/lib/current-user";
import { redirect } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await requireAdmin().catch(() => null);
  if (!u) redirect("/app/dashboard");
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AdminNav />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

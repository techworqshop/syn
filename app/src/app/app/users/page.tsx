import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import UsersManager from "./UsersManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const u = await requireUser();
  if (!u.isAdmin) redirect("/app/dashboard");
  return <UsersManager currentUserId={u.id} />;
}

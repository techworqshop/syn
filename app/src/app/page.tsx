import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Root-Routing:
// - Eingeloggte User: direkt in die App
// - Anonyme User: auf die Landing-Page (spaeter wird das auf der eigenen
//   Domain die Domain-Root sein; aktuell ist es ein interner Pfad).
export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/app/dashboard");
  redirect("/landing");
}

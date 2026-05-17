import { redirect } from "next/navigation";

// Backwards-compat: alte /landing-URLs zeigen jetzt auf /.
// Die Marketing-Inhalte sind auf die Root umgezogen.
export default function LandingRedirect() {
  redirect("/");
}

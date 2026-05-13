// Edge-Middleware: NextAuth's `auth` Export wirkt hier als Wrapper.
// Sobald ein Request an einen der Matcher-Pfade kommt, ruft NextAuth den
// `authorized` Callback (in lib/auth.ts) auf. Ist der Callback false ->
// Redirect zum signIn-Page; bei API-Pfaden -> 401.
import { auth } from "@/lib/auth";

export default auth;

// Matcher: nur die Routen die wir schützen wollen -- alles andere bleibt
// public und ohne Auth-Roundtrip. /api/n8n/callback bewusst NICHT hier,
// weil das Endpoint via X-Syn-Callback-Secret Header gesichert ist.
export const config = {
  matcher: [
    "/app/:path*",
    "/api/users/:path*",
    "/api/invites/:path*"
  ]
};

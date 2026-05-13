// Edge-Middleware: NextAuth's `auth` Export wirkt hier als Wrapper.
// Sobald ein Request an einen der Matcher-Pfade kommt, ruft NextAuth den
// `authorized` Callback (in lib/auth.ts) auf. Ist der Callback false ->
// Redirect zum signIn-Page; bei API-Pfaden -> 401.
import { auth } from "@/lib/auth";

export default auth;

// Run middleware in nodejs runtime (NOT edge) because the jwt callback in
// lib/auth.ts performs DB lookups via postgres-js, which only works under
// node. Edge runtime would silently fail to load the driver and crash.
export const runtime = "nodejs";

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

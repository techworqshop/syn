import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

// Pfade die NUR Admins zugänglich sind
const ADMIN_PATHS = [
  "/app/admin",
  "/api/users",
  "/api/invites"
];

function isAdminPath(pathname: string): boolean {
  return ADMIN_PATHS.some(p => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?"));
}

// Pfade die nur eingeloggte User erlaubt (egal Admin oder nicht)
const PROTECTED_PATHS = ["/app"];
function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      authorize: async (credentials) => {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!u) return null;
        const ok = await bcrypt.compare(password, u.passwordHash);
        if (!ok) return null;
        if (u.deletionRequestedAt) {
          console.warn(`[auth] Login blocked — account ${u.email} flagged for deletion at ${u.deletionRequestedAt}`);
          return null;
        }
        return { id: u.id, email: u.email, name: u.name ?? u.email, isAdmin: u.isAdmin } as { id: string; email: string; name: string; isAdmin: boolean };
      }
    })
  ],
  callbacks: {
    // Embed isAdmin in the JWT so edge middleware can check without DB hit.
    // Source-of-truth bleibt requireAdmin() in den Server-Components / API-Routes.
    async jwt({ token, user }) {
      // Initial sign-in: user-object hat isAdmin direkt aus authorize()
      if (user) {
        token.isAdmin = (user as unknown as { isAdmin?: boolean }).isAdmin === true;
      }
      // Bestehende Sessions (vor dem isAdmin-Rollout) haben isAdmin = undefined.
      // Wir holen es hier einmal nach, anhand der Email im Token, ohne Sign-Out
      // forcen zu muessen.
      if (token.isAdmin === undefined && token.email) {
        try {
          const [u] = await db.select({ isAdmin: users.isAdmin })
            .from(users).where(eq(users.email, token.email as string)).limit(1);
          token.isAdmin = u?.isAdmin === true;
        } catch { token.isAdmin = false; }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as unknown as { isAdmin?: boolean }).isAdmin = token.isAdmin === true;
      }
      return session;
    },
    // Wird vom Middleware-Layer + jedem geschützten Page-Load aufgerufen.
    authorized: async ({ auth, request }) => {
      const path = request.nextUrl.pathname;
      const loggedIn = !!auth?.user;
      const isAdmin = (auth?.user as unknown as { isAdmin?: boolean } | undefined)?.isAdmin === true;

      if (isAdminPath(path)) {
        return loggedIn && isAdmin;
      }
      if (isProtectedPath(path)) {
        return loggedIn;
      }
      // Public: /, /login, /invite/[token], /share/[token], /api/n8n/callback etc.
      return true;
    }
  }
});

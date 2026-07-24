import type { NextAuthConfig } from "next-auth";

// Edge-safe base config (no Prisma). Used by the middleware (src/proxy.ts) and
// extended in src/auth.ts with the Prisma-backed Credentials provider.
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as { id?: string; desaId?: string | null; role?: string };
        token.id = u.id;
        token.desaId = u.desaId ?? null;
        token.role = u.role ?? "operator";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.desaId = (token.desaId as string | null) ?? null;
        session.user.role = (token.role as string) ?? "operator";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

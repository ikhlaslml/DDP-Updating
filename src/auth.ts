import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = typeof credentials?.email === "string" ? credentials.email : undefined;
        const password = typeof credentials?.password === "string" ? credentials.password : undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, desaId: user.desaId, role: user.role };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Runs in the Node.js app context (route handlers / server components), so it
    // can rehydrate tokens created before desaId/role existed, or that lost them.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.desaId = user.desaId ?? null;
        token.role = user.role ?? "operator";
        return token;
      }
      if (token.id && token.desaId === undefined) {
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { desaId: true, role: true },
        });
        if (u) {
          token.desaId = u.desaId ?? null;
          token.role = u.role ?? "operator";
        }
      }
      return token;
    },
  },
});

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    desaId?: string | null;
    role?: string;
  }
  interface Session {
    user: {
      id: string;
      desaId: string | null;
      role: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    desaId?: string | null;
    role?: string;
  }
}

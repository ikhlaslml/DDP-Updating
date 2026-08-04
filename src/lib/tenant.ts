import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AuthContext = {
  userId: string;
  desaId: string;
  role: string;
  userName: string;
  userEmail: string;
};

// Resolve the tenant + role for the current request. Returns null when there is
// no session or the user is not attached to a desa.
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  // Authorize against the current database row on every mutation/read. A JWT
  // can outlive a role or tenant reassignment; trusting only its cached claims
  // would let a revoked operator keep merging data until the token expires.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, desaId: true, role: true, name: true, email: true },
  });
  if (!user?.desaId) return null;
  return {
    userId: user.id,
    desaId: user.desaId,
    role: user.role,
    userName: user.name ?? user.email ?? "Operator Desa",
    userEmail: user.email ?? "",
  };
}

export function isOperator(role: string) {
  return role === "operator";
}

export const UNAUTHORIZED = NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
export const FORBIDDEN = NextResponse.json(
  { error: "Peran Anda (pemerintah desa) hanya dapat melihat data, bukan mengubahnya." },
  { status: 403 }
);

import { NextResponse } from "next/server";
import { auth } from "@/auth";

export type AuthContext = { userId: string; desaId: string; role: string };

// Resolve the tenant + role for the current request. Returns null when there is
// no session or the user is not attached to a desa.
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.desaId) return null;
  return { userId: session.user.id, desaId: session.user.desaId, role: session.user.role ?? "operator" };
}

export function isOperator(role: string) {
  return role === "operator";
}

export const UNAUTHORIZED = NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
export const FORBIDDEN = NextResponse.json(
  { error: "Peran Anda (pemerintah desa) hanya dapat melihat data, bukan mengubahnya." },
  { status: 403 }
);

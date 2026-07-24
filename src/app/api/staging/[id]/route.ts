import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, isOperator, UNAUTHORIZED, FORBIDDEN } from "@/lib/tenant";

// Cancel (Batal) a single pending staged change.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;
  const { id } = await params;
  const existing = await prisma.stagingChange.findFirst({ where: { id, desaId: ctx.desaId } });
  if (!existing) return NextResponse.json({ error: "Perubahan tidak ditemukan" }, { status: 404 });
  await prisma.stagingChange.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

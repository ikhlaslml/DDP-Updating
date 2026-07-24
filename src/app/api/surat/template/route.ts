import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const data = await prisma.suratTemplate.findMany({
    where: { desaId: ctx.desaId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ data });
}

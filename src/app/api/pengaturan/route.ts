import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, isOperator, UNAUTHORIZED, FORBIDDEN } from "@/lib/tenant";

const FIELDS = ["namaKepala", "kopBaris1", "kopBaris2", "kopBaris3", "kopBaris4", "penutup", "disclaimer"] as const;

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const s = await prisma.pengaturanDesa.findUnique({ where: { desaId: ctx.desaId } });
  return NextResponse.json({ data: s });
}

export async function PUT(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });

  const data: Record<string, string> = {};
  for (const f of FIELDS) {
    if (typeof body[f] === "string") data[f] = body[f];
  }

  const updated = await prisma.pengaturanDesa.upsert({
    where: { desaId: ctx.desaId },
    update: data,
    create: { desaId: ctx.desaId, ...data },
  });
  return NextResponse.json({ data: updated });
}

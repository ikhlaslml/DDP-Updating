import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { FORBIDDEN, getAuthContext, isOperator, UNAUTHORIZED } from "@/lib/tenant";

const codeSchema = z.object({
  id: z.string().min(1),
  kode: z.string().trim().min(1).max(32).regex(/^\d+(?:\.\d+)*$/, "Kode surat harus berupa angka, misalnya 470 atau 474.1"),
  kategori: z.string().trim().min(1).max(32).regex(/^[A-Za-z0-9_-]+$/, "Kategori hanya boleh berisi huruf, angka, garis bawah, atau tanda hubung"),
});

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const data = await prisma.suratTemplate.findMany({
    where: { desaId: ctx.desaId },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ data });
}

export async function PUT(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;

  const parsed = codeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Kode surat tidak valid" }, { status: 400 });
  }

  const template = await prisma.suratTemplate.findFirst({
    where: { id: parsed.data.id, desaId: ctx.desaId },
    select: { id: true },
  });
  if (!template) return NextResponse.json({ error: "Jenis surat tidak ditemukan pada desa ini" }, { status: 404 });

  const data = await prisma.suratTemplate.update({
    where: { id: template.id },
    data: { kode: parsed.data.kode, kategori: parsed.data.kategori },
  });
  return NextResponse.json({ data });
}

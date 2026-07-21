import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pendudukUpdateSchema, flattenZodError } from "@/lib/validation";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await prisma.penduduk.findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ data: record });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });

  const parsed = pendudukUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validasi gagal", fields: flattenZodError(parsed.error) }, { status: 400 });
  }

  const existing = await prisma.penduduk.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });

  const newNik = parsed.data.nik as string | undefined;
  if (newNik && newNik !== existing.nik) {
    const dupe = await prisma.penduduk.findUnique({ where: { nik: newNik } });
    if (dupe) {
      return NextResponse.json({ error: "Validasi gagal", fields: { nik: "NIK sudah terdaftar" } }, { status: 400 });
    }
  }

  const updated = await prisma.penduduk.update({ where: { id }, data: parsed.data as never });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.penduduk.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });

  await prisma.penduduk.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

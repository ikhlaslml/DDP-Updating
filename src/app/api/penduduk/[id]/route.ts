import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pendudukUpdateSchema, flattenZodError } from "@/lib/validation";
import { getAuthContext, isOperator, UNAUTHORIZED, FORBIDDEN } from "@/lib/tenant";
import { completeFamilyProgress } from "@/lib/family-progress";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const { id } = await params;
  const record = await prisma.penduduk.findFirst({ where: { id, desaId: ctx.desaId } });
  if (!record) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ data: record });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });

  const parsed = pendudukUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validasi gagal", fields: flattenZodError(parsed.error) }, { status: 400 });
  }

  const existing = await prisma.penduduk.findFirst({ where: { id, desaId: ctx.desaId } });
  if (!existing) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });

  const newNik = parsed.data.nik as string | undefined;
  if (newNik && newNik !== existing.nik) {
    const dupe = await prisma.penduduk.findUnique({ where: { nik: newNik } });
    if (dupe) {
      return NextResponse.json({ error: "Validasi gagal", fields: { nik: "NIK sudah terdaftar" } }, { status: 400 });
    }
    const pendingDupe = await prisma.stagingChange.findFirst({
      where: { entityType: "PENDUDUK", status: "PENDING", nik: newNik, NOT: { pendudukId: id } },
    });
    if (pendingDupe) {
      return NextResponse.json({ error: "Validasi gagal", fields: { nik: "NIK sudah ada di perubahan sementara" } }, { status: 400 });
    }
  }

  const staged = await prisma.$transaction(async (tx) => {
    await tx.stagingChange.deleteMany({ where: { pendudukId: id, desaId: ctx.desaId, status: "PENDING" } });
    const change = await tx.stagingChange.create({
      data: {
        desaId: ctx.desaId,
        entityType: "PENDUDUK",
        aksi: "UPDATE",
        pendudukId: id,
        nik: newNik ?? existing.nik,
        nama: typeof parsed.data.nama === "string" ? parsed.data.nama : existing.nama,
        ringkasan: "Data diperbarui melalui API.",
        data: JSON.stringify(parsed.data),
        createdBy: ctx.userId,
        createdByName: ctx.userName,
        createdByEmail: ctx.userEmail,
      },
    });
    if (existing.status_dalam_keluarga === "Kepala Keluarga" && existing.nkk) {
      await completeFamilyProgress(tx, {
        desaId: ctx.desaId,
        nkk: existing.nkk,
        userId: ctx.userId,
        userName: ctx.userName,
      });
    }
    return change;
  });
  return NextResponse.json({ data: staged }, { status: 202 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;
  const { id } = await params;
  const existing = await prisma.penduduk.findFirst({ where: { id, desaId: ctx.desaId } });
  if (!existing) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });

  const staged = await prisma.$transaction(async (tx) => {
    await tx.stagingChange.deleteMany({ where: { pendudukId: id, desaId: ctx.desaId, status: "PENDING" } });
    return tx.stagingChange.create({
      data: {
        desaId: ctx.desaId,
        entityType: "PENDUDUK",
        aksi: "DELETE",
        pendudukId: id,
        nik: existing.nik,
        nama: existing.nama,
        ringkasan: "Penghapusan data melalui API.",
        createdBy: ctx.userId,
        createdByName: ctx.userName,
        createdByEmail: ctx.userEmail,
      },
    });
  });
  return NextResponse.json({ ok: true, data: staged }, { status: 202 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pendudukCreateSchema, pendudukUpdateSchema, flattenZodError } from "@/lib/validation";
import { getAuthContext, isOperator, UNAUTHORIZED, FORBIDDEN } from "@/lib/tenant";
import { completeFamilyProgress } from "@/lib/family-progress";

// GET: list all pending staged changes, enriched for the "Data Perubahan
// Sementara" table.
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const changes = await prisma.stagingChange.findMany({
    where: { desaId: ctx.desaId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  const targetIds = changes.map((c) => c.pendudukId).filter(Boolean) as string[];
  const targets = targetIds.length
    ? await prisma.penduduk.findMany({ where: { id: { in: targetIds }, desaId: ctx.desaId } })
    : [];
  const targetMap = new Map(targets.map((t) => [t.id, t as Record<string, unknown>]));

  const data = changes.map((c) => {
    const rawData = c.entityType === "PERISTIWA" ? c.eventData : c.data;
    const proposed = rawData ? (JSON.parse(rawData) as Record<string, unknown>) : {};
    const base = c.pendudukId ? targetMap.get(c.pendudukId) ?? {} : {};
    const merged = { ...base, ...proposed };
    return {
      id: c.id,
      entityType: c.entityType,
      eventType: c.eventType,
      groupId: c.groupId,
      aksi: c.aksi,
      pendudukId: c.pendudukId,
      ringkasan: c.ringkasan,
      createdAt: c.createdAt,
      createdByName: c.createdByName ?? "Operator Desa",
      createdByEmail: c.createdByEmail,
      row: {
        kodeBangunan: c.entityType === "BANGUNAN" ? proposed.kode ?? null : merged.kode_bangunan ?? null,
        jenisBangunan: c.entityType === "BANGUNAN" ? proposed.jenis ?? null : null,
        kategoriBangunan: c.entityType === "BANGUNAN" ? proposed.kategori ?? null : null,
        nkk: merged.nkk ?? null,
        nik: c.nik ?? merged.nik ?? null,
        nama: c.nama ?? merged.nama ?? null,
        jk: merged.jk ?? null,
        dusun: merged.dusun ?? null,
        tgl_lahir: merged.tgl_lahir ?? null,
        alamat: merged.alamat ?? null,
      },
    };
  });

  return NextResponse.json({ data, total: data.length });
}

// POST: stage a CREATE / UPDATE / DELETE against the baseline.
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.aksi !== "string") {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }
  const aksi = body.aksi as "CREATE" | "UPDATE" | "DELETE";

  if (aksi === "CREATE") {
    const parsed = pendudukCreateSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validasi gagal", fields: flattenZodError(parsed.error) }, { status: 400 });
    }
    const data = { ...parsed.data } as Record<string, unknown>;
    if (!data.abs_id) data.abs_id = `ABS${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const dupe = await prisma.penduduk.findUnique({ where: { nik: data.nik as string } });
    if (dupe) return NextResponse.json({ error: "Validasi gagal", fields: { nik: "NIK sudah terdaftar" } }, { status: 400 });
    const pendingDupe = await prisma.stagingChange.findFirst({
      where: { entityType: "PENDUDUK", status: "PENDING", nik: data.nik as string },
    });
    if (pendingDupe) {
      return NextResponse.json({ error: "Validasi gagal", fields: { nik: "NIK sudah ada di perubahan sementara" } }, { status: 400 });
    }

    const created = await prisma.stagingChange.create({
      data: {
        desaId: ctx.desaId,
        entityType: "PENDUDUK",
        aksi: "CREATE",
        nik: (data.nik as string) ?? null,
        nama: (data.nama as string) ?? null,
        ringkasan: "Penambahan data baru.",
        data: JSON.stringify(data),
        createdBy: ctx.userId,
        createdByName: ctx.userName,
        createdByEmail: ctx.userEmail,
      },
    });
    return NextResponse.json({ data: created }, { status: 201 });
  }

  if (aksi === "UPDATE") {
    const pendudukId = body.pendudukId as string | undefined;
    if (!pendudukId) return NextResponse.json({ error: "pendudukId wajib" }, { status: 400 });
    const existing = await prisma.penduduk.findFirst({ where: { id: pendudukId, desaId: ctx.desaId } });
    if (!existing) return NextResponse.json({ error: "Data warga tidak ditemukan" }, { status: 404 });
    const pendingEvent = await prisma.stagingChange.findFirst({ where: { pendudukId, desaId: ctx.desaId, status: "PENDING", entityType: "PERISTIWA" } });
    if (pendingEvent) return NextResponse.json({ error: "Warga ini masih punya peristiwa yang menunggu diterapkan" }, { status: 409 });

    const parsed = pendudukUpdateSchema.safeParse(body.data);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validasi gagal", fields: flattenZodError(parsed.error) }, { status: 400 });
    }
    // Replace any earlier pending change atomically so a failed insert never
    // erases the operator's previous proposal.
    const created = await prisma.$transaction(async (tx) => {
      await tx.stagingChange.deleteMany({ where: { pendudukId, desaId: ctx.desaId, status: "PENDING" } });
      const change = await tx.stagingChange.create({
        data: {
          desaId: ctx.desaId,
          entityType: "PENDUDUK",
          aksi: "UPDATE",
          pendudukId,
          nik: existing.nik,
          nama: existing.nama,
          ringkasan: "Data diperbarui.",
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
    return NextResponse.json({ data: created }, { status: 201 });
  }

  if (aksi === "DELETE") {
    const pendudukId = body.pendudukId as string | undefined;
    if (!pendudukId) return NextResponse.json({ error: "pendudukId wajib" }, { status: 400 });
    const existing = await prisma.penduduk.findFirst({ where: { id: pendudukId, desaId: ctx.desaId } });
    if (!existing) return NextResponse.json({ error: "Data warga tidak ditemukan" }, { status: 404 });
    const pendingEvent = await prisma.stagingChange.findFirst({ where: { pendudukId, desaId: ctx.desaId, status: "PENDING", entityType: "PERISTIWA" } });
    if (pendingEvent) return NextResponse.json({ error: "Warga ini masih punya peristiwa yang menunggu diterapkan" }, { status: 409 });

    const created = await prisma.$transaction(async (tx) => {
      await tx.stagingChange.deleteMany({ where: { pendudukId, desaId: ctx.desaId, status: "PENDING" } });
      return tx.stagingChange.create({
        data: {
          desaId: ctx.desaId,
          entityType: "PENDUDUK",
          aksi: "DELETE",
          pendudukId,
          nik: existing.nik,
          nama: existing.nama,
          ringkasan: "Penghapusan data.",
          createdBy: ctx.userId,
          createdByName: ctx.userName,
          createdByEmail: ctx.userEmail,
        },
      });
    });
    return NextResponse.json({ data: created }, { status: 201 });
  }

  return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
}

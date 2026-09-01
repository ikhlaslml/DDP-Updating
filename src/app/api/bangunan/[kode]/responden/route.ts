import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { FORBIDDEN, getAuthContext, isOperator, UNAUTHORIZED } from "@/lib/tenant";

const respondentSchema = z.object({
  nama: z.string().trim().min(2).max(150),
  mediaAssetId: z.string().trim().min(1),
  fotoUrl: z.string().trim().startsWith("/api/media/"),
});

function stagedBuildingHasCode(data: string | null, code: number) {
  try {
    return Number((JSON.parse(data ?? "{}") as { kode?: unknown }).kode) === code;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ kode: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;
  const code = Number((await params).kode);
  if (!Number.isSafeInteger(code) || code <= 0) {
    return NextResponse.json({ error: "Kode bangunan tidak valid" }, { status: 400 });
  }
  const submitted = respondentSchema.safeParse(await req.json().catch(() => null));
  if (!submitted.success) {
    return NextResponse.json({ error: "Nama dan foto responden wajib diisi" }, { status: 400 });
  }

  try {
    const session = await prisma.$transaction(async (tx) => {
      const [building, legacy, pendingBuildings, media, deletedBuilding] = await Promise.all([
        tx.bangunan.findFirst({ where: { desaId: ctx.desaId, kode: code, jenis: "BERPENGHUNI" } }),
        tx.penduduk.findFirst({ where: { desaId: ctx.desaId, kode_bangunan: code, statusAktif: true } }),
        tx.stagingChange.findMany({
          where: { desaId: ctx.desaId, entityType: "BANGUNAN", aksi: "CREATE", status: "PENDING" },
          select: { groupId: true, data: true },
        }),
        tx.mediaAsset.findFirst({
          where: { id: submitted.data.mediaAssetId, desaId: ctx.desaId, purpose: "RESPONDEN" },
        }),
        tx.bangunanDihapus.findUnique({ where: { desaId_kodeBangunan: { desaId: ctx.desaId, kodeBangunan: code } }, select: { id: true } }),
      ]);
      if (deletedBuilding) throw new Error("Bangunan ini sudah dihapus dari peta aktif dan tidak dapat didata kembali");
      const pending = pendingBuildings.find((row) => stagedBuildingHasCode(row.data, code));
      if (!building && !legacy && !pending) throw new Error("Bangunan berpenghuni tidak ditemukan pada desa ini");
      if (!media || submitted.data.fotoUrl !== `/api/media/${media.id}`) {
        throw new Error("Foto responden tidak valid untuk desa ini");
      }

      const [latest, snapshot] = await Promise.all([
        tx.sesiPendataanBangunan.findFirst({
          where: { desaId: ctx.desaId, kodeBangunan: code },
          orderBy: { diisiPada: "desc" },
          select: { id: true },
        }),
        tx.snapshot.findFirst({ where: { desaId: ctx.desaId }, orderBy: { urutan: "desc" }, select: { kode: true } }),
      ]);
      return tx.sesiPendataanBangunan.create({
        data: {
          desaId: ctx.desaId,
          bangunanId: building?.id ?? null,
          kodeBangunan: code,
          stagingGroupId: pending?.groupId ?? null,
          periode: snapshot?.kode ?? "T0",
          namaResponden: submitted.data.nama,
          fotoRespondenUrl: submitted.data.fotoUrl,
          mediaAssetId: media.id,
          enumeratorId: ctx.userId,
          enumeratorName: ctx.userName,
          enumeratorEmail: ctx.userEmail || null,
          supersedesId: latest?.id ?? null,
        },
      });
    });
    return NextResponse.json({ data: session }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kunjungan responden gagal disimpan" },
      { status: 400 }
    );
  }
}

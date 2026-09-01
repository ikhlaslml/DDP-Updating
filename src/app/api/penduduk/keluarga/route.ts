import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const heads = await prisma.penduduk.findMany({
    where: {
      desaId: ctx.desaId,
      statusAktif: true,
      status_dalam_keluarga: "Kepala Keluarga",
      nkk: { not: null },
      ...(q
        ? {
            OR: [
              { nama: { contains: q, mode: "insensitive" as const } },
              { nik: { contains: q } },
              { nkk: { contains: q } },
            ],
          }
        : {}),
    },
    distinct: ["nkk"],
    orderBy: { nama: "asc" },
    take: 100,
  });
  const deletedBuildings = await prisma.bangunanDihapus.findMany({ where: { desaId: ctx.desaId }, select: { kodeBangunan: true } });
  const deletedCodes = new Set(deletedBuildings.map((building) => building.kodeBangunan));
  const activeHeads = heads.filter((head) => head.kode_bangunan === null || !deletedCodes.has(head.kode_bangunan));
  const progress = activeHeads.length ? await prisma.progresPendataanKeluarga.findMany({
    where: { desaId: ctx.desaId, nkk: { in: activeHeads.flatMap((head) => head.nkk ? [head.nkk] : []) } },
    orderBy: { updatedAt: "desc" },
  }) : [];
  const progressByNkk = new Map(progress.map((row) => [row.nkk, row]));

  return NextResponse.json({
    data: activeHeads.map((head) => ({
      id: head.id,
      nkk: head.nkk as string,
      nik: head.nik ?? "",
      nama: head.nama ?? "Tanpa nama",
      kodeBangunan: head.kode_bangunan,
      dusun: head.dusun,
      rw: head.rw,
      rt: head.rt,
      alamat: head.alamat,
      jumlahAnggota: head.jml_keluarga,
      statusPendataan: head.nkk ? progressByNkk.get(head.nkk)?.status ?? "LENGKAP" : "LENGKAP",
      aspekTerakhir: head.nkk ? progressByNkk.get(head.nkk)?.aspekTerakhir ?? 6 : 6,
    })),
  });
}

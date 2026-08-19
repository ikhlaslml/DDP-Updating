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

  return NextResponse.json({
    data: heads.map((head) => ({
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
    })),
  });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;

  const [desa, buildings, heads] = await Promise.all([
    prisma.desa.findUnique({
      where: { id: ctx.desaId },
      select: { nama: true, kodeWilayah: true, droneTilePrefix: true, centerLat: true, centerLng: true },
    }),
    prisma.bangunan.findMany({
      where: { desaId: ctx.desaId },
      orderBy: { createdAt: "desc" },
      // The selector and map context never need photo/base64 or polygon blobs.
      select: {
        id: true,
        kode: true,
        jenis: true,
        kategori: true,
        keterangan: true,
        centroidLat: true,
        centroidLng: true,
        dusun: true,
        rw: true,
        rt: true,
        alamat: true,
      },
    }),
    prisma.penduduk.findMany({
      where: { desaId: ctx.desaId, statusAktif: true, status_dalam_keluarga: "Kepala Keluarga", kode_bangunan: { not: null } },
      select: {
        kode_bangunan: true,
        kode_deskel: true,
        nama: true,
        nkk: true,
        dusun: true,
        rw: true,
        rt: true,
        alamat: true,
        lat: true,
        lng: true,
      },
    }),
  ]);

  const knownCodes = new Set(buildings.map((building) => building.kode));
  const parseCoordinate = (value: string | null, axis: "lat" | "lng") => {
    if (value === null || value.trim() === "") return null;
    const coordinate = Number(value);
    const [minimum, maximum] = axis === "lat" ? [-11, 6] : [95, 141];
    return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum
      ? coordinate
      : null;
  };
  const legacyCode = (desa?.kodeWilayah ?? heads.find((head) => head.kode_deskel)?.kode_deskel)?.replace(/\D/g, "");
  const fallbackDronePrefix = legacyCode?.length === 10
    ? `${legacyCode.slice(0, 2)}.${legacyCode.slice(2, 4)}.${legacyCode.slice(4, 6)}.${legacyCode.slice(6)}`
    : null;
  const legacy = heads
    .filter((head) => head.kode_bangunan !== null && !knownCodes.has(head.kode_bangunan))
    .filter((head, index, rows) => rows.findIndex((other) => other.kode_bangunan === head.kode_bangunan) === index)
    .map((head) => ({
      id: `legacy-${head.kode_bangunan}`,
      kode: head.kode_bangunan as number,
      jenis: "BERPENGHUNI",
      kategori: null,
      keterangan: "Bangunan baseline sensus",
      polygon: null,
      centroidLat: parseCoordinate(head.lat, "lat"),
      centroidLng: parseCoordinate(head.lng, "lng"),
      dusun: head.dusun,
      rw: head.rw,
      rt: head.rt,
      alamat: head.alamat,
      kepalaKeluarga: head.nama,
      nkk: head.nkk,
      legacy: true,
    }));

  return NextResponse.json({
    data: [...buildings.map((building) => ({ ...building, legacy: false })), ...legacy],
    context: desa
      ? {
          ...desa,
          kodeWilayah: desa.kodeWilayah ?? legacyCode ?? null,
          droneTilePrefix: desa.droneTilePrefix ?? fallbackDronePrefix,
        }
      : null,
  });
}

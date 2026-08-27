import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const [rows, buildings, desa] = await Promise.all([
    prisma.penduduk.findMany({
      // Count every resident. Coordinates are validated separately below so a
      // member without coordinates does not disappear from household totals.
      where: { desaId: ctx.desaId, statusAktif: true },
      select: {
        id: true,
        kode_bangunan: true,
        kode_deskel: true,
        nkk: true,
        nama: true,
        nama_kepala_rumah: true,
        dusun: true,
        rw: true,
        rt: true,
        alamat: true,
        lat: true,
        lng: true,
        status_dalam_keluarga: true,
        miskin_bps: true,
        miskin_ekstrem: true,
      },
    }),
    prisma.bangunan.findMany({
      where: { desaId: ctx.desaId },
      select: {
        id: true,
        kode: true,
        jenis: true,
        kategori: true,
        keterangan: true,
        polygon: true,
        centroidLat: true,
        centroidLng: true,
        dusun: true,
        rw: true,
        rt: true,
        alamat: true,
      },
    }),
    prisma.desa.findUnique({
      where: { id: ctx.desaId },
      select: { kodeWilayah: true, droneTilePrefix: true, centerLat: true, centerLng: true },
    }),
  ]);

  const households = new Map<
    string,
    {
      id: string;
      nkk: string;
      kodeBangunan: number | null;
      namaKepalaKeluarga: string;
      dusun: string | null;
      rw: number | null;
      rt: number | null;
      alamat: string | null;
      lat: number;
      lng: number;
      jumlahAnggota: number;
      miskinBps: boolean;
      miskinEkstrem: boolean;
    }
  >();

  const householdCountByNkk = new Map<string, number>();
  for (const row of rows) {
    if (row.nkk) householdCountByNkk.set(row.nkk, (householdCountByNkk.get(row.nkk) ?? 0) + 1);
  }

  for (const r of rows) {
    if (!r.nkk) continue;
    // lat/lng are character varying in the `ajaib` schema — parse to numbers.
    const latNum = r.lat != null ? parseFloat(r.lat) : NaN;
    const lngNum = r.lng != null ? parseFloat(r.lng) : NaN;
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) continue;
    const key = r.nkk;
    const existing = households.get(key);
    if (!existing) {
      households.set(key, {
        id: r.id,
        nkk: r.nkk,
        kodeBangunan: r.kode_bangunan,
        namaKepalaKeluarga: r.nama_kepala_rumah || r.nama || "-",
        dusun: r.dusun,
        rw: r.rw,
        rt: r.rt,
        alamat: r.alamat,
        lat: latNum,
        lng: lngNum,
        jumlahAnggota: householdCountByNkk.get(key) ?? 1,
        miskinBps: r.miskin_bps === "Ya",
        miskinEkstrem: r.miskin_ekstrem === "Ya",
      });
    } else {
      if (r.status_dalam_keluarga === "Kepala Keluarga") {
        existing.id = r.id;
        existing.kodeBangunan = r.kode_bangunan ?? existing.kodeBangunan;
        existing.namaKepalaKeluarga = r.nama || "-";
        existing.miskinBps = r.miskin_bps === "Ya";
        existing.miskinEkstrem = r.miskin_ekstrem === "Ya";
      }
      if (existing.kodeBangunan === null && r.kode_bangunan !== null) existing.kodeBangunan = r.kode_bangunan;
    }
  }

  const residentCountByBuilding = new Map<number, number>();
  for (const row of rows) {
    if (row.kode_bangunan !== null) {
      residentCountByBuilding.set(row.kode_bangunan, (residentCountByBuilding.get(row.kode_bangunan) ?? 0) + 1);
    }
  }

  const fallbackCode = (desa?.kodeWilayah ?? rows.find((row) => row.kode_deskel)?.kode_deskel)?.replace(/\D/g, "");
  const formattedFallback =
    fallbackCode?.length === 10
      ? `${fallbackCode.slice(0, 2)}.${fallbackCode.slice(2, 4)}.${fallbackCode.slice(4, 6)}.${fallbackCode.slice(6)}`
      : null;

  const validBuildings = buildings.flatMap((building) => {
    try {
      const polygon = JSON.parse(building.polygon) as {
        type?: unknown;
        coordinates?: unknown;
      };
      const ring = Array.isArray(polygon.coordinates) ? polygon.coordinates[0] : null;
      const validRing =
        polygon.type === "Polygon" &&
        Array.isArray(ring) &&
        ring.length >= 4 &&
        ring.every(
          (coordinate) =>
            Array.isArray(coordinate) &&
            coordinate.length >= 2 &&
            Number.isFinite(coordinate[0]) &&
            Number.isFinite(coordinate[1])
        );
      if (!validRing) return [];
      return [{
        id: building.id,
        kode: building.kode,
        jenis: building.jenis,
        kategori: building.kategori,
        keterangan: building.keterangan,
        polygon: { type: "Polygon" as const, coordinates: [ring as number[][]] },
        centroidLat: building.centroidLat,
        centroidLng: building.centroidLng,
        dusun: building.dusun,
        rw: building.rw,
        rt: building.rt,
        alamat: building.alamat,
        jumlahPenghuni: residentCountByBuilding.get(building.kode) ?? 0,
      }];
    } catch {
      return [];
    }
  });

  return NextResponse.json({
    data: [...households.values()],
    buildings: validBuildings,
    context: {
      droneTilePrefix: desa?.droneTilePrefix ?? formattedFallback,
      centerLat: desa?.centerLat,
      centerLng: desa?.centerLng,
    },
  });
}

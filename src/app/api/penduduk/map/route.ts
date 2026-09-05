import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";
import { loadPeriodicFamilies } from "@/lib/periodic-updating";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const [rows, buildings, desa, deletedBuildings] = await Promise.all([
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
        punya_ktp: true,
        punya_aktalahir: true,
        bpjs_kes: true,
        rumah_pln: true,
        airbersih: true,
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
    prisma.bangunanDihapus.findMany({ where: { desaId: ctx.desaId }, select: { kodeBangunan: true } }),
  ]);
  const deletedCodes = new Set(deletedBuildings.map((building) => building.kodeBangunan));
  // Residents remain in the baseline for audit/move workflow, but a building
  // that was physically removed must no longer appear as a household marker.
  const activeRows = rows.filter((row) => row.kode_bangunan === null || !deletedCodes.has(row.kode_bangunan));

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
      anggotaPunyaKtp: number;
      anggotaPunyaAktaLahir: number;
      anggotaBpjsKesehatan: number;
      rumahPln: string | null;
      airBersih: string | null;
    }
  >();

  const householdCountByNkk = new Map<string, number>();
  for (const row of activeRows) {
    if (row.nkk) householdCountByNkk.set(row.nkk, (householdCountByNkk.get(row.nkk) ?? 0) + 1);
  }

  for (const r of activeRows) {
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
        anggotaPunyaKtp: r.punya_ktp === "Ya" ? 1 : 0,
        anggotaPunyaAktaLahir: r.punya_aktalahir === "Ya" ? 1 : 0,
        anggotaBpjsKesehatan: r.bpjs_kes === "Ya" ? 1 : 0,
        rumahPln: r.rumah_pln,
        airBersih: r.airbersih,
      });
    } else {
      if (r.punya_ktp === "Ya") existing.anggotaPunyaKtp += 1;
      if (r.punya_aktalahir === "Ya") existing.anggotaPunyaAktaLahir += 1;
      if (r.bpjs_kes === "Ya") existing.anggotaBpjsKesehatan += 1;
      if (r.status_dalam_keluarga === "Kepala Keluarga") {
        existing.id = r.id;
        existing.kodeBangunan = r.kode_bangunan ?? existing.kodeBangunan;
        existing.namaKepalaKeluarga = r.nama || "-";
        existing.rumahPln = r.rumah_pln;
        existing.airBersih = r.airbersih;
      }
      if (existing.kodeBangunan === null && r.kode_bangunan !== null) existing.kodeBangunan = r.kode_bangunan;
    }
  }

  const residentCountByBuilding = new Map<number, number>();
  for (const row of activeRows) {
    if (row.kode_bangunan !== null) {
      residentCountByBuilding.set(row.kode_bangunan, (residentCountByBuilding.get(row.kode_bangunan) ?? 0) + 1);
    }
  }

  const fallbackCode = (desa?.kodeWilayah ?? activeRows.find((row) => row.kode_deskel)?.kode_deskel)?.replace(/\D/g, "");
  const formattedFallback =
    fallbackCode?.length === 10
      ? `${fallbackCode.slice(0, 2)}.${fallbackCode.slice(2, 4)}.${fallbackCode.slice(4, 6)}.${fallbackCode.slice(6)}`
      : null;

  const validBuildings = buildings.filter((building) => !deletedCodes.has(building.kode)).flatMap((building) => {
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
  const [sixMonthFamilies, annualFamilies] = await Promise.all([
    loadPeriodicFamilies(ctx.desaId, "SIX_MONTHS"),
    loadPeriodicFamilies(ctx.desaId, "ANNUAL"),
  ]);
  const sixMonthStatus = new Map(sixMonthFamilies.map((family) => [family.nkk, family.status]));
  const annualStatus = new Map(annualFamilies.map((family) => [family.nkk, family.status]));

  return NextResponse.json({
    data: [...households.values()].map((household) => ({
      ...household,
      update6MonthStatus: sixMonthStatus.get(household.nkk) ?? "TERKINI",
      updateAnnualStatus: annualStatus.get(household.nkk) ?? "TERKINI",
    })),
    buildings: validBuildings,
    context: {
      droneTilePrefix: desa?.droneTilePrefix ?? formattedFallback,
      centerLat: desa?.centerLat,
      centerLng: desa?.centerLng,
    },
  });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const rows = await prisma.penduduk.findMany({
    where: { desaId: ctx.desaId, lat: { not: null }, lng: { not: null } },
    select: {
      id: true,
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
  });

  const households = new Map<
    string,
    {
      id: string;
      nkk: string;
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
        namaKepalaKeluarga: r.nama_kepala_rumah || r.nama || "-",
        dusun: r.dusun,
        rw: r.rw,
        rt: r.rt,
        alamat: r.alamat,
        lat: latNum,
        lng: lngNum,
        jumlahAnggota: 1,
        miskinBps: r.miskin_bps === "Ya",
        miskinEkstrem: r.miskin_ekstrem === "Ya",
      });
    } else {
      existing.jumlahAnggota += 1;
      if (r.status_dalam_keluarga === "Kepala Keluarga") {
        existing.namaKepalaKeluarga = r.nama || "-";
        existing.miskinBps = r.miskin_bps === "Ya";
        existing.miskinEkstrem = r.miskin_ekstrem === "Ya";
      }
    }
  }

  return NextResponse.json({ data: [...households.values()] });
}

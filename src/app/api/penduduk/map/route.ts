import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.penduduk.findMany({
    where: { lat: { not: null }, lng: { not: null } },
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
      rw: string | null;
      rt: string | null;
      alamat: string | null;
      lat: number;
      lng: number;
      jumlahAnggota: number;
      miskinBps: boolean;
      miskinEkstrem: boolean;
    }
  >();

  for (const r of rows) {
    if (r.lat === null || r.lng === null || !r.nkk) continue;
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
        lat: r.lat,
        lng: r.lng,
        jumlahAnggota: 1,
        miskinBps: !!r.miskin_bps,
        miskinEkstrem: !!r.miskin_ekstrem,
      });
    } else {
      existing.jumlahAnggota += 1;
      if (r.status_dalam_keluarga === "Kepala Keluarga") {
        existing.namaKepalaKeluarga = r.nama || "-";
        existing.miskinBps = !!r.miskin_bps;
        existing.miskinEkstrem = !!r.miskin_ekstrem;
      }
    }
  }

  return NextResponse.json({ data: [...households.values()] });
}

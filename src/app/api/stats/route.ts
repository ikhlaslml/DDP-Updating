import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

function ageBucket(usia: number | null): string {
  if (usia === null) return "Tidak diketahui";
  if (usia < 5) return "0-4";
  if (usia < 10) return "5-9";
  if (usia < 15) return "10-14";
  if (usia < 20) return "15-19";
  if (usia < 25) return "20-24";
  if (usia < 30) return "25-29";
  if (usia < 35) return "30-34";
  if (usia < 40) return "35-39";
  if (usia < 45) return "40-44";
  if (usia < 50) return "45-49";
  if (usia < 55) return "50-54";
  if (usia < 60) return "55-59";
  if (usia < 65) return "60-64";
  return "65+";
}
const AGE_BUCKET_ORDER = [
  "0-4", "5-9", "10-14", "15-19", "20-24", "25-29", "30-34", "35-39",
  "40-44", "45-49", "50-54", "55-59", "60-64", "65+",
];

function topN(counts: Record<string, number>, n: number) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, value]) => ({ label, value }));
}

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const [all, demographicEvents] = await Promise.all([prisma.penduduk.findMany({
    where: { desaId: ctx.desaId, statusAktif: true },
    select: {
      nkk: true,
      dusun: true,
      jk: true,
      usia: true,
      ijazah: true,
      kerja_profesi: true,
      agama: true,
      status_dalam_keluarga: true,
      punya_ktp: true,
      punya_aktalahir: true,
      bpjs_kes: true,
    },
  }), prisma.peristiwaKependudukan.findMany({
    where: { desaId: ctx.desaId, tanggal: { gte: startMonth } },
    select: { jenis: true, tanggal: true },
  })]);

  const totalPenduduk = all.length;
  const totalKk = new Set(all.map((r) => r.nkk).filter(Boolean)).size;

  const perDusun: Record<string, number> = {};
  const pyramid: Record<string, { L: number; P: number }> = {};
  const ijazahCount: Record<string, number> = {};
  const profesiCount: Record<string, number> = {};
  const agamaCount: Record<string, number> = {};
  let ktpCount = 0;
  let aktaLahirCount = 0;
  let bpjsKesCount = 0;

  for (const r of all) {
    if (r.dusun) perDusun[r.dusun] = (perDusun[r.dusun] || 0) + 1;

    const bucket = ageBucket(r.usia);
    if (!pyramid[bucket]) pyramid[bucket] = { L: 0, P: 0 };
    if (r.jk === "L") pyramid[bucket].L += 1;
    else if (r.jk === "P") pyramid[bucket].P += 1;

    if (r.ijazah) ijazahCount[r.ijazah] = (ijazahCount[r.ijazah] || 0) + 1;
    if (r.kerja_profesi) profesiCount[r.kerja_profesi] = (profesiCount[r.kerja_profesi] || 0) + 1;
    if (r.agama) agamaCount[r.agama] = (agamaCount[r.agama] || 0) + 1;
    if (r.punya_ktp === "Ya") ktpCount += 1;
    if (r.punya_aktalahir === "Ya") aktaLahirCount += 1;
    if (r.bpjs_kes === "Ya") bpjsKesCount += 1;
  }

  const pct = (n: number) => (totalPenduduk ? Math.round((n / totalPenduduk) * 100) : 0);
  const eventTypes = ["KELAHIRAN", "KEMATIAN", "MIGRASI_MASUK", "MIGRASI_KELUAR"] as const;
  const eventCounts = Object.fromEntries(eventTypes.map((type) => [type, 0])) as Record<(typeof eventTypes)[number], number>;
  const monthRows = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(startMonth.getFullYear(), startMonth.getMonth() + index, 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
      KELAHIRAN: 0,
      KEMATIAN: 0,
      MIGRASI_MASUK: 0,
      MIGRASI_KELUAR: 0,
    };
  });
  const monthByKey = new Map(monthRows.map((row) => [row.key, row]));
  for (const event of demographicEvents) {
    if (!eventTypes.includes(event.jenis as (typeof eventTypes)[number])) continue;
    const type = event.jenis as (typeof eventTypes)[number];
    eventCounts[type] += 1;
    const key = `${event.tanggal.getFullYear()}-${String(event.tanggal.getMonth() + 1).padStart(2, "0")}`;
    const month = monthByKey.get(key);
    if (month) month[type] += 1;
  }

  return NextResponse.json({
    totalPenduduk,
    totalKk,
    perDusun: Object.entries(perDusun).map(([label, value]) => ({ label, value })),
    piramidaPenduduk: AGE_BUCKET_ORDER.filter((b) => pyramid[b]).map((b) => ({
      usia: b,
      L: pyramid[b]?.L || 0,
      P: pyramid[b]?.P || 0,
    })),
    pendidikan: topN(ijazahCount, 10),
    pekerjaan: topN(profesiCount, 10),
    agama: topN(agamaCount, 10),
    demografi: {
      kelahiran: eventCounts.KELAHIRAN,
      kematian: eventCounts.KEMATIAN,
      migrasiMasuk: eventCounts.MIGRASI_MASUK,
      migrasiKeluar: eventCounts.MIGRASI_KELUAR,
      migrasiNeto: eventCounts.MIGRASI_MASUK - eventCounts.MIGRASI_KELUAR,
      bulanan: monthRows,
    },
    cakupan: {
      ktp: pct(ktpCount),
      aktaLahir: pct(aktaLahirCount),
      bpjsKes: pct(bpjsKesCount),
    },
  });
}

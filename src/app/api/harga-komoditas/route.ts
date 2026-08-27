import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { FORBIDDEN, getAuthContext, isOperator, UNAUTHORIZED } from "@/lib/tenant";

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const moneySchema = z.union([z.number(), z.string().trim().min(1)])
  .transform((value) => Number(value))
  .refine((value) => Number.isFinite(value) && value >= 0 && value <= 999_999_999_999_999.99, {
    message: "Harga harus berupa angka positif yang valid",
  });
const saveSchema = z.object({
  periode: z.string().regex(PERIOD_PATTERN),
  sumberData: z.string().trim().min(2).max(200),
  rows: z.array(z.object({ komoditasId: z.string().min(1), harga: moneySchema })).min(1).max(100),
});

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const requested = req.nextUrl.searchParams.get("periode") ?? currentPeriod();
  const periode = PERIOD_PATTERN.test(requested) ? requested : currentPeriod();

  const [catalog, selectedPrices, historyRows] = await Promise.all([
    prisma.komoditas.findMany({
      where: { aktif: true },
      orderBy: [{ kategori: "asc" }, { urutan: "asc" }],
    }),
    prisma.hargaKomoditas.findMany({ where: { desaId: ctx.desaId, periode } }),
    prisma.hargaKomoditas.findMany({
      where: { desaId: ctx.desaId },
      orderBy: [{ periode: "desc" }, { updatedAt: "desc" }],
      take: 2_000,
    }),
  ]);
  const selected = new Map(selectedPrices.map((row) => [row.komoditasId, row]));
  const latest = new Map<string, (typeof historyRows)[number]>();
  for (const row of historyRows) if (!latest.has(row.komoditasId)) latest.set(row.komoditasId, row);

  return NextResponse.json({
    periode,
    data: catalog.map((item) => {
      const value = selected.get(item.id);
      const newest = latest.get(item.id);
      return {
        id: item.id,
        kode: item.kode,
        kategori: item.kategori,
        nama: item.nama,
        satuan: item.satuan,
        urutan: item.urutan,
        harga: value?.harga.toString() ?? "",
        sumberData: value?.sumberData ?? "",
        updatedAt: value?.updatedAt.toISOString() ?? null,
        hargaTerakhir: newest?.harga.toString() ?? null,
        periodeTerakhir: newest?.periode ?? null,
        tanggalPembaruanTerakhir: newest?.updatedAt.toISOString() ?? null,
      };
    }),
    history: historyRows.map((row) => ({
      id: row.id,
      komoditasId: row.komoditasId,
      periode: row.periode,
      harga: row.harga.toString(),
      sumberData: row.sumberData,
      updatedByName: row.updatedByName,
      updatedAt: row.updatedAt.toISOString(),
    })),
    periods: [...new Set(historyRows.map((row) => row.periode))],
  });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;
  const parsed = saveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Periode, sumber data, dan harga yang valid wajib diisi" }, { status: 400 });
  }

  const uniqueRows = [...new Map(parsed.data.rows.map((row) => [row.komoditasId, row])).values()];
  const validCatalog = await prisma.komoditas.findMany({
    where: { id: { in: uniqueRows.map((row) => row.komoditasId) }, aktif: true },
    select: { id: true },
  });
  if (validCatalog.length !== uniqueRows.length) {
    return NextResponse.json({ error: "Terdapat komoditas yang tidak terdaftar atau sudah tidak aktif" }, { status: 400 });
  }

  await prisma.$transaction(uniqueRows.map((row) => prisma.hargaKomoditas.upsert({
    where: {
      desaId_komoditasId_periode: {
        desaId: ctx.desaId,
        komoditasId: row.komoditasId,
        periode: parsed.data.periode,
      },
    },
    update: {
      harga: new Prisma.Decimal(row.harga),
      sumberData: parsed.data.sumberData,
      updatedBy: ctx.userId,
      updatedByName: ctx.userName,
    },
    create: {
      desaId: ctx.desaId,
      komoditasId: row.komoditasId,
      periode: parsed.data.periode,
      harga: new Prisma.Decimal(row.harga),
      sumberData: parsed.data.sumberData,
      createdBy: ctx.userId,
      createdByName: ctx.userName,
      updatedBy: ctx.userId,
      updatedByName: ctx.userName,
    },
  })));
  return NextResponse.json({ data: { count: uniqueRows.length, periode: parsed.data.periode } });
}

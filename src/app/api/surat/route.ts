import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext, isOperator, UNAUTHORIZED, FORBIDDEN } from "@/lib/tenant";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const issueSchema = z.object({
  templateId: z.string().min(1),
  pendudukId: z.string().min(1),
  keperluan: z.string().trim().min(1, "Keperluan surat wajib diisi").max(500),
  peristiwaId: z.string().optional(),
  confirmed: z.literal(true, { error: "Surat harus dipratinjau dan diperiksa sebelum diterbitkan" }),
});

const LETTER_RESIDENT_SELECT = {
  id: true,
  nama: true,
  nik: true,
  jk: true,
  tgl_lahir: true,
  agama: true,
  status_kawin: true,
  kerja_profesi: true,
  alamat: true,
} as const;

function endExclusive(value: string | null) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(sp.get("pageSize")) || 10));
  const q = sp.get("q")?.trim();
  const templateId = sp.get("templateId")?.trim();
  const dateFrom = sp.get("dateFrom") ? new Date(`${sp.get("dateFrom")}T00:00:00.000Z`) : undefined;
  const dateTo = endExclusive(sp.get("dateTo"));
  const where: Prisma.SuratTerbitWhereInput = {
    desaId: ctx.desaId,
    ...(q ? { OR: [
      { nomor: { contains: q, mode: "insensitive" } },
      { templateNama: { contains: q, mode: "insensitive" } },
      { namaWarga: { contains: q, mode: "insensitive" } },
      { nik: { contains: q } },
      { keperluan: { contains: q, mode: "insensitive" } },
    ] } : {}),
    ...(templateId ? { templateId } : {}),
    ...((dateFrom && !Number.isNaN(dateFrom.getTime())) || dateTo ? {
      createdAt: {
        ...(dateFrom && !Number.isNaN(dateFrom.getTime()) ? { gte: dateFrom } : {}),
        ...(dateTo ? { lt: dateTo } : {}),
      },
    } : {}),
  };
  const [total, data] = await Promise.all([
    prisma.suratTerbit.count({ where }),
    prisma.suratTerbit.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return NextResponse.json({
    data,
    total,
    recent: data.slice(0, 5),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;
  const submitted = issueSchema.safeParse(await req.json().catch(() => null));
  if (!submitted.success) return NextResponse.json({ error: submitted.error.issues[0]?.message ?? "Data surat belum lengkap" }, { status: 400 });

  try {
    const created = await prisma.$transaction(async (tx) => {
      const [template, resident, settings, event] = await Promise.all([
        tx.suratTemplate.findFirst({ where: { id: submitted.data.templateId, desaId: ctx.desaId } }),
        tx.penduduk.findFirst({ where: { id: submitted.data.pendudukId, desaId: ctx.desaId }, select: LETTER_RESIDENT_SELECT }),
        tx.pengaturanDesa.findUnique({ where: { desaId: ctx.desaId } }),
        submitted.data.peristiwaId
          ? tx.peristiwaKependudukan.findFirst({ where: { id: submitted.data.peristiwaId, desaId: ctx.desaId } })
          : null,
      ]);
      if (!template) throw new Error("Template tidak ditemukan pada desa ini");
      if (!resident) throw new Error("Penduduk tidak ditemukan pada desa ini");
      if (submitted.data.peristiwaId && !event) throw new Error("Referensi peristiwa tidak ditemukan");

      const now = new Date();
      const year = now.getFullYear();
      const counter = await tx.nomorSuratCounter.upsert({
        where: { desaId_tahun: { desaId: ctx.desaId, tahun: year } },
        create: { desaId: ctx.desaId, tahun: year, nomorTerakhir: 1 },
        update: { nomorTerakhir: { increment: 1 } },
      });
      const sequence = counter.nomorTerakhir;
      const nomor = `${template.kode}/${String(sequence).padStart(3, "0")}/${template.kategori}/${ROMAN[now.getMonth()]}/${year}`;
      const renderedBody = template.isi
        .replace(/\{\{nama_desa\}\}/g, settings?.kopBaris3 || "Desa")
        .replace(/\{\{keperluan\}\}/g, submitted.data.keperluan || "________");

      return tx.suratTerbit.create({
        data: {
          desaId: ctx.desaId,
          nomor,
          templateId: template.id,
          templateNama: template.nama,
          pendudukId: resident.id,
          namaWarga: resident.nama,
          nik: resident.nik,
          keperluan: submitted.data.keperluan || null,
          peristiwaId: event?.id ?? null,
          jenisPeristiwa: event?.jenis ?? null,
          tahunNomor: year,
          urutanNomor: sequence,
          isiSnapshot: renderedBody,
          pengaturanSnapshot: JSON.stringify(settings ?? {}),
          wargaSnapshot: JSON.stringify(resident),
          issuedBy: ctx.userId,
          issuedByName: ctx.userName,
          issuedByEmail: ctx.userEmail || null,
        },
      });
    }, { isolationLevel: "Serializable", timeout: 15_000 });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Surat gagal diterbitkan" }, { status: 400 });
  }
}

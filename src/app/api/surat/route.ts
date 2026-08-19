import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, isOperator, UNAUTHORIZED, FORBIDDEN } from "@/lib/tenant";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

// GET: recent issued letters + total (for the dashboard "Surat Keluar" card).
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const [total, recent] = await Promise.all([
    prisma.suratTerbit.count({ where: { desaId: ctx.desaId } }),
    prisma.suratTerbit.findMany({ where: { desaId: ctx.desaId }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  return NextResponse.json({ total, recent });
}

// POST: issue a letter and log it. Returns the generated nomor.
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;

  const body = await req.json().catch(() => null);
  if (!body?.templateId) return NextResponse.json({ error: "Template wajib dipilih" }, { status: 400 });

  const template = await prisma.suratTemplate.findFirst({ where: { id: body.templateId, desaId: ctx.desaId } });
  if (!template) return NextResponse.json({ error: "Template tidak ditemukan" }, { status: 404 });
  const event = body.peristiwaId
    ? await prisma.peristiwaKependudukan.findFirst({ where: { id: body.peristiwaId, desaId: ctx.desaId } })
    : null;
  if (body.peristiwaId && !event) return NextResponse.json({ error: "Referensi peristiwa tidak ditemukan" }, { status: 404 });

  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const seq = (await prisma.suratTerbit.count({ where: { desaId: ctx.desaId, createdAt: { gte: startOfYear } } })) + 1;
  const nomor = `${template.kode}/${String(seq).padStart(3, "0")}/${template.kategori}/${ROMAN[now.getMonth()]}/${year}`;

  const created = await prisma.suratTerbit.create({
    data: {
      desaId: ctx.desaId,
      nomor,
      templateId: template.id,
      templateNama: template.nama,
      pendudukId: body.pendudukId ?? null,
      namaWarga: body.namaWarga ?? null,
      nik: body.nik ?? null,
      keperluan: body.keperluan ?? null,
      peristiwaId: event?.id ?? null,
      jenisPeristiwa: event?.jenis ?? null,
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}

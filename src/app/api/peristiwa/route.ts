import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext, isOperator, UNAUTHORIZED, FORBIDDEN } from "@/lib/tenant";
import {
  generatedMigrationRegionKey,
  migrationRegionLabel,
} from "@/lib/migration-region";

const eventSchema = z.object({
  type: z.enum(["KEMATIAN", "MIGRASI_KELUAR"]),
  pendudukId: z.string().min(1),
  scope: z.enum(["INDIVIDUAL", "FAMILY"]).default("INDIVIDUAL"),
  tanggal: z.coerce.date().refine((date) => date.getTime() <= Date.now(), "Tanggal tidak boleh di masa depan"),
  replacementId: z.string().optional(),
  penyebab: z.string().trim().max(200).optional(),
  punyaAkta: z.string().trim().max(50).optional(),
  nomorAkta: z.string().trim().max(100).optional(),
  tujuan: z.string().trim().max(300).optional(),
  desaKelurahan: z.string().trim().max(150).optional(),
  kecamatan: z.string().trim().max(150).optional(),
  kabupatenKota: z.string().trim().max(150).optional(),
  provinsi: z.string().trim().max(150).optional(),
  alasan: z.string().trim().max(500).optional(),
}).superRefine((value, ctx) => {
  if (value.type === "KEMATIAN" && value.scope === "FAMILY") {
    ctx.addIssue({ code: "custom", path: ["scope"], message: "Kematian dicatat per individu" });
  }
  if (value.type === "KEMATIAN" && !value.penyebab) {
    ctx.addIssue({ code: "custom", path: ["penyebab"], message: "Penyebab kematian wajib dipilih" });
  }
  if (value.type === "MIGRASI_KELUAR") {
    for (const field of ["desaKelurahan", "kecamatan", "kabupatenKota", "provinsi"] as const) {
      if (!value[field]) {
        ctx.addIssue({ code: "custom", path: [field], message: "Wilayah tujuan wajib diisi lengkap" });
      }
    }
  }
});

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const event = await prisma.peristiwaKependudukan.findFirst({ where: { id, desaId: ctx.desaId } });
    if (!event) return NextResponse.json({ error: "Peristiwa tidak ditemukan" }, { status: 404 });
    const resident = event.pendudukId
      ? await prisma.penduduk.findFirst({ where: { id: event.pendudukId, desaId: ctx.desaId } })
      : null;
    const death = !resident && event.pendudukId
      ? await prisma.kematian.findFirst({ where: { pendudukIdAsal: event.pendudukId, desaId: ctx.desaId } })
      : null;
    let archivedResident: Record<string, unknown> | null = null;
    if (death?.dataPenduduk) {
      try { archivedResident = JSON.parse(death.dataPenduduk) as Record<string, unknown>; } catch { archivedResident = null; }
    }
    return NextResponse.json({ data: { event, resident: resident ?? archivedResident ?? { id: event.pendudukId, nama: event.nama, nik: event.nik } } });
  }
  const view = req.nextUrl.searchParams.get("view");
  if (view === "history") {
    const [deaths, events] = await Promise.all([
      prisma.kematian.findMany({ where: { desaId: ctx.desaId }, orderBy: { tanggal: "desc" }, take: 200 }),
      prisma.peristiwaKependudukan.findMany({ where: { desaId: ctx.desaId }, orderBy: { tanggal: "desc" }, take: 300 }),
    ]);
    return NextResponse.json({ deaths, events });
  }

  const query = req.nextUrl.searchParams.get("q")?.trim();
  const residents = await prisma.penduduk.findMany({
    where: {
      desaId: ctx.desaId,
      statusAktif: true,
      ...(query ? {
        OR: [
          { nama: { contains: query, mode: "insensitive" as const } },
          { nik: { contains: query } },
          { nkk: { contains: query } },
        ],
      } : {}),
    },
    select: {
      id: true,
      nama: true,
      nik: true,
      nkk: true,
      status_dalam_keluarga: true,
      tgl_lahir: true,
      jk: true,
      dusun: true,
    },
    orderBy: [{ nkk: "asc" }, { status_dalam_keluarga: "asc" }, { nama: "asc" }],
    take: 150,
  });
  return NextResponse.json({ data: residents });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;
  const parsed = eventSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join("."), issue.message]));
    return NextResponse.json({ error: "Data peristiwa belum lengkap", fields }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const selected = await tx.penduduk.findFirst({
        where: { id: parsed.data.pendudukId, desaId: ctx.desaId, statusAktif: true },
      });
      if (!selected) throw new Error("Penduduk tidak ditemukan atau sudah nonaktif");
      const targets = parsed.data.scope === "FAMILY"
        ? await tx.penduduk.findMany({ where: { desaId: ctx.desaId, nkk: selected.nkk, statusAktif: true } })
        : [selected];
      const targetIds = targets.map((target) => target.id);
      const remaining = selected.nkk
        ? await tx.penduduk.findMany({
            where: { desaId: ctx.desaId, nkk: selected.nkk, statusAktif: true, id: { notIn: targetIds } },
            select: { id: true, nama: true, nkk: true },
          })
        : [];
      if (selected.status_dalam_keluarga === "Kepala Keluarga" && remaining.length > 0) {
        const replacement = remaining.find((member) => member.id === parsed.data.replacementId);
        if (!replacement) throw new Error("Pilih kepala keluarga pengganti sebelum menyimpan peristiwa");
      }
      const pending = await tx.stagingChange.findFirst({
        where: {
          desaId: ctx.desaId,
          status: "PENDING",
          OR: [{ pendudukId: { in: targetIds } }, { eventData: { contains: selected.id } }],
        },
      });
      if (pending) throw new Error("Salah satu penduduk sudah memiliki perubahan yang menunggu penggabungan");

      const region = parsed.data.type === "MIGRASI_KELUAR"
        ? {
            desaKelurahan: parsed.data.desaKelurahan as string,
            kecamatan: parsed.data.kecamatan as string,
            kabupatenKota: parsed.data.kabupatenKota as string,
            provinsi: parsed.data.provinsi as string,
          }
        : null;
      const details = {
        ...parsed.data,
        tanggal: parsed.data.tanggal.toISOString(),
        pendudukIds: targetIds,
        ...(region
          ? {
              tujuan: migrationRegionLabel(region),
              wilayahKodeDeskel: generatedMigrationRegionKey(region),
            }
          : {}),
      };
      return tx.stagingChange.create({
        data: {
          desaId: ctx.desaId,
          entityType: "PERISTIWA",
          groupId: randomUUID(),
          aksi: "EVENT",
          eventType: parsed.data.type,
          eventData: JSON.stringify(details),
          pendudukId: selected.id,
          nik: selected.nik,
          nama: selected.nama,
          ringkasan: parsed.data.type === "KEMATIAN"
            ? `Kematian ${selected.nama ?? selected.nik}`
            : `${parsed.data.scope === "FAMILY" ? "Migrasi keluar keluarga" : "Migrasi keluar"} ${selected.nama ?? selected.nik}`,
          createdBy: ctx.userId,
          createdByName: ctx.userName,
          createdByEmail: ctx.userEmail,
        },
      });
    });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal menyimpan peristiwa" }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordFieldUpdate } from "@/lib/field-updates";
import { cycleFromSlug, periodicColumns } from "@/lib/updating-columns";
import { invalidatePeriodicUpdatingCache } from "@/lib/updating-cache";
import { getAuthContext, isOperator, UNAUTHORIZED, FORBIDDEN } from "@/lib/tenant";

const itemSchema = z.object({
  scope: z.enum(["FAMILY", "PERSON"]),
  nkk: z.string().regex(/^\d{16}$/).optional(),
  pendudukId: z.string().min(1).optional(),
  fields: z.array(z.string().min(1)).min(1).max(100),
  catatan: z.string().trim().max(500).optional(),
}).superRefine((value, ctx) => {
  if (value.scope === "FAMILY" && !value.nkk) {
    ctx.addIssue({ code: "custom", path: ["nkk"], message: "Nomor KK wajib diisi" });
  }
  if (value.scope === "PERSON" && !value.pendudukId) {
    ctx.addIssue({ code: "custom", path: ["pendudukId"], message: "Penduduk wajib dipilih" });
  }
});

const submissionSchema = z.object({
  siklus: z.enum(["6-bulan", "1-tahun"]),
  items: z.array(itemSchema).min(1).max(500),
});

function pendingFields(value: string | null) {
  try {
    const parsed = JSON.parse(value ?? "{}");
    return new Set(
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? Object.keys(parsed)
        : [],
    );
  } catch {
    return new Set<string>();
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;
  const parsed = submissionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Konfirmasi tidak valid" }, { status: 400 });
  }
  const cycle = cycleFromSlug(parsed.data.siklus);
  const columns = periodicColumns(cycle);

  try {
    const confirmed = await prisma.$transaction(async (tx) => {
      let count = 0;
      const now = new Date();
      for (const item of parsed.data.items) {
        const fields = [...new Set(item.fields)];
        if (item.scope === "FAMILY") {
          const allowed = new Set(columns.family);
          const invalid = fields.filter((field) => !allowed.has(field));
          if (invalid.length) throw new Error(`Kolom keluarga tidak valid: ${invalid.join(", ")}`);
          const residents = await tx.penduduk.findMany({
            where: { desaId: ctx.desaId, nkk: item.nkk, statusAktif: true },
            select: { id: true, nkk: true },
          });
          if (!residents.length) throw new Error("Keluarga tidak ditemukan");
          const pending = await tx.stagingChange.findMany({
            where: {
              desaId: ctx.desaId,
              pendudukId: { in: residents.map((resident) => resident.id) },
              entityType: "PENDUDUK",
              aksi: "UPDATE",
              status: "PENDING",
            },
            select: { data: true },
          });
          if (pending.some((change) => fields.some((field) => pendingFields(change.data).has(field)))) {
            throw new Error("Salah satu kolom sudah diedit dan menunggu penggabungan");
          }
          for (const resident of residents) {
            for (const field of fields) {
              await recordFieldUpdate(tx, {
                desaId: ctx.desaId,
                pendudukId: resident.id,
                nkk: resident.nkk,
                field,
                scope: "FAMILY",
                source: "CONFIRMED_NO_CHANGE",
                actor: ctx,
                catatan: item.catatan,
                updatedAt: now,
              });
              count += 1;
            }
          }
          continue;
        }

        const resident = await tx.penduduk.findFirst({
          where: { id: item.pendudukId, desaId: ctx.desaId, statusAktif: true },
          select: { id: true, nkk: true, status_dalam_keluarga: true },
        });
        if (!resident) throw new Error("Penduduk tidak ditemukan");
        const role = resident.status_dalam_keluarga === "Kepala Keluarga" ? "HEAD" : "MEMBER";
        const allowed = new Set(role === "HEAD" ? columns.head : columns.member);
        const invalid = fields.filter((field) => !allowed.has(field));
        if (invalid.length) throw new Error(`Kolom anggota tidak valid: ${invalid.join(", ")}`);
        const pending = await tx.stagingChange.findFirst({
          where: {
            desaId: ctx.desaId,
            pendudukId: resident.id,
            entityType: "PENDUDUK",
            aksi: "UPDATE",
            status: "PENDING",
          },
          select: { data: true },
        });
        if (pending && fields.some((field) => pendingFields(pending.data).has(field))) {
          throw new Error("Salah satu kolom sudah diedit dan menunggu penggabungan");
        }
        for (const field of fields) {
          await recordFieldUpdate(tx, {
            desaId: ctx.desaId,
            pendudukId: resident.id,
            nkk: resident.nkk,
            field,
            scope: "PERSON",
            source: "CONFIRMED_NO_CHANGE",
            actor: ctx,
            catatan: item.catatan,
            updatedAt: now,
          });
          count += 1;
        }
      }
      return count;
    }, { isolationLevel: "Serializable", timeout: 60_000 });
    invalidatePeriodicUpdatingCache();
    return NextResponse.json({ confirmed });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Konfirmasi gagal" },
      { status: 400 },
    );
  }
}

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { pendudukUpdateSchema, flattenZodError } from "@/lib/validation";
import { periodicColumns, cycleFromSlug } from "@/lib/updating-columns";
import { invalidatePeriodicUpdatingCache } from "@/lib/updating-cache";
import { stageFieldPatch } from "@/lib/stage-field-patch";
import { getAuthContext, isOperator, UNAUTHORIZED, FORBIDDEN } from "@/lib/tenant";

const submissionSchema = z.object({
  scope: z.enum(["FAMILY", "PERSON"]),
  siklus: z.enum(["6-bulan", "1-tahun"]),
  nkk: z.string().regex(/^\d{16}$/).optional(),
  pendudukId: z.string().min(1).optional(),
  data: z.record(z.string(), z.unknown()),
}).superRefine((value, ctx) => {
  if (value.scope === "FAMILY" && !value.nkk) {
    ctx.addIssue({ code: "custom", path: ["nkk"], message: "Nomor KK wajib diisi" });
  }
  if (value.scope === "PERSON" && !value.pendudukId) {
    ctx.addIssue({ code: "custom", path: ["pendudukId"], message: "Penduduk wajib dipilih" });
  }
  if (Object.keys(value.data).length === 0) {
    ctx.addIssue({ code: "custom", path: ["data"], message: "Tidak ada nilai yang diperbarui" });
  }
});


export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;
  const parsed = submissionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data pembaruan belum lengkap", fields: flattenZodError(parsed.error) },
      { status: 400 },
    );
  }
  const cycle = cycleFromSlug(parsed.data.siklus);
  const columns = periodicColumns(cycle);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const groupId = randomUUID();
      if (parsed.data.scope === "FAMILY") {
        const allowed = new Set(columns.family);
        const invalid = Object.keys(parsed.data.data).filter((field) => !allowed.has(field));
        if (invalid.length) throw new Error(`Kolom keluarga tidak valid: ${invalid.join(", ")}`);
        const validated = pendudukUpdateSchema.safeParse(parsed.data.data);
        if (!validated.success) {
          const error = new Error("Nilai pembaruan tidak valid") as Error & {
            fields?: Record<string, string>;
          };
          error.fields = flattenZodError(validated.error);
          throw error;
        }
        const residents = await tx.penduduk.findMany({
          where: {
            desaId: ctx.desaId,
            nkk: parsed.data.nkk,
            statusAktif: true,
          },
          select: { id: true, nik: true, nama: true },
        });
        if (!residents.length) throw new Error("Keluarga tidak ditemukan");
        const changes = [];
        for (const resident of residents) {
          changes.push(
            await stageFieldPatch(tx, {
              desaId: ctx.desaId,
              groupId,
              resident,
              data: validated.data as Record<string, unknown>,
              actor: ctx,
              scope: "FAMILY",
              ringkasan: "Pembaruan berkala tingkat keluarga.",
            }),
          );
        }
        return changes;
      }

      const resident = await tx.penduduk.findFirst({
        where: {
          id: parsed.data.pendudukId,
          desaId: ctx.desaId,
          statusAktif: true,
        },
        select: {
          id: true,
          nik: true,
          nama: true,
          status_dalam_keluarga: true,
        },
      });
      if (!resident) throw new Error("Penduduk tidak ditemukan");
      const role = resident.status_dalam_keluarga === "Kepala Keluarga" ? "HEAD" : "MEMBER";
      const allowed = new Set(role === "HEAD" ? columns.head : columns.member);
      const invalid = Object.keys(parsed.data.data).filter((field) => !allowed.has(field));
      if (invalid.length) throw new Error(`Kolom anggota tidak valid: ${invalid.join(", ")}`);
      const validated = pendudukUpdateSchema.safeParse(parsed.data.data);
      if (!validated.success) {
        const error = new Error("Nilai pembaruan tidak valid") as Error & {
          fields?: Record<string, string>;
        };
        error.fields = flattenZodError(validated.error);
        throw error;
      }
      return [
        await stageFieldPatch(tx, {
          desaId: ctx.desaId,
          groupId,
          resident,
          data: validated.data as Record<string, unknown>,
          actor: ctx,
          scope: "PERSON",
          ringkasan: "Pembaruan berkala anggota keluarga.",
        }),
      ];
    }, { isolationLevel: "Serializable", timeout: 30_000 });
    invalidatePeriodicUpdatingCache();
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const known = error as Error & { fields?: Record<string, string> };
    return NextResponse.json(
      { error: known.message || "Gagal menyimpan pembaruan", fields: known.fields ?? {} },
      { status: 400 },
    );
  }
}

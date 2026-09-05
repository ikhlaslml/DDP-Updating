import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { flattenZodError, pendudukUpdateSchema } from "@/lib/validation";
import { fieldLabel } from "@/lib/field-labels";
import { mapping } from "@/lib/indikator";
import { isHouseholdField } from "@/lib/survey";
import { isInlineEditableField, updateScopeForField } from "@/lib/updating-columns";
import { stageFieldPatch } from "@/lib/stage-field-patch";
import { invalidatePeriodicUpdatingCache } from "@/lib/updating-cache";
import { getAuthContext, isOperator, UNAUTHORIZED, FORBIDDEN } from "@/lib/tenant";

const submissionSchema = z.object({
  pendudukId: z.string().min(1),
  field: z.string().min(1),
  value: z.unknown(),
});

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;

  const parsed = submissionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data perubahan sel belum lengkap", fields: flattenZodError(parsed.error) },
      { status: 400 },
    );
  }

  const { pendudukId, field, value } = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const resident = await tx.penduduk.findFirst({
        where: { id: pendudukId, desaId: ctx.desaId, statusAktif: true },
        select: {
          id: true,
          nik: true,
          nama: true,
          nkk: true,
          status_dalam_keluarga: true,
        },
      });
      if (!resident) throw new Error("Penduduk tidak ditemukan");

      const personRole = resident.status_dalam_keluarga === "Kepala Keluarga" ? "HEAD" : "MEMBER";
      const editRole = isHouseholdField(field) ? "HEAD" : personRole;
      if (!isInlineEditableField(field, editRole)) {
        throw new Error("Kolom ini tidak dapat diubah dari tabel");
      }
      if (!isHouseholdField(field) && personRole === "MEMBER" && !isInlineEditableField(field, "MEMBER")) {
        throw new Error("Kolom ini hanya diisi untuk peran yang sesuai");
      }

      const validated = pendudukUpdateSchema.safeParse({ [field]: value });
      if (!validated.success) {
        const error = new Error("Nilai tidak valid") as Error & { fields?: Record<string, string> };
        error.fields = flattenZodError(validated.error);
        throw error;
      }
      const data = { [field]: (validated.data as Record<string, unknown>)[field] };
      const scope = updateScopeForField(field);
      const groupId = randomUUID();
      const label = fieldLabel(field, mapping.kolom[field]);

      if (scope === "FAMILY") {
        if (!resident.nkk) throw new Error("Nomor KK tidak ditemukan");
        const members = await tx.penduduk.findMany({
          where: { desaId: ctx.desaId, nkk: resident.nkk, statusAktif: true },
          select: { id: true, nik: true, nama: true },
        });
        if (!members.length) throw new Error("Keluarga tidak ditemukan");
        const changes = [];
        for (const member of members) {
          changes.push(
            await stageFieldPatch(tx, {
              desaId: ctx.desaId,
              groupId,
              resident: member,
              data,
              actor: ctx,
              scope: "FAMILY",
              ringkasan: `Ubah ${label} tingkat keluarga.`,
            }),
          );
        }
        return { scope, nkk: resident.nkk, changes };
      }

      const change = await stageFieldPatch(tx, {
        desaId: ctx.desaId,
        groupId,
        resident,
        data,
        actor: ctx,
        scope: "PERSON",
        ringkasan: `Ubah ${label}.`,
      });
      return { scope, nkk: resident.nkk, changes: [change] };
    }, { isolationLevel: "Serializable", timeout: 30_000 });

    invalidatePeriodicUpdatingCache();
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const known = error as Error & { fields?: Record<string, string> };
    return NextResponse.json(
      { error: known.message || "Gagal menyimpan perubahan sel", fields: known.fields ?? {} },
      { status: 400 },
    );
  }
}

import type { Prisma } from "@prisma/client";

export type FieldUpdateActor = {
  userId: string;
  userName: string;
  userEmail: string;
};

export async function recordFieldUpdate(
  tx: Prisma.TransactionClient,
  input: {
    desaId: string;
    pendudukId: string;
    nkk: string | null;
    field: string;
    scope: "FAMILY" | "PERSON";
    source: "EDIT" | "CONFIRMED_NO_CHANGE";
    actor: FieldUpdateActor;
    stagingChangeId?: string | null;
    catatan?: string | null;
    updatedAt?: Date;
  },
) {
  const updatedAt = input.updatedAt ?? new Date();
  const audit = {
    desaId: input.desaId,
    nkk: input.nkk,
    scope: input.scope,
    source: input.source,
    updatedById: input.actor.userId,
    updatedByName: input.actor.userName,
    updatedByEmail: input.actor.userEmail,
    stagingChangeId: input.stagingChangeId ?? null,
    catatan: input.catatan ?? null,
  };
  await tx.fieldUpdate.upsert({
    where: {
      pendudukId_field: {
        pendudukId: input.pendudukId,
        field: input.field,
      },
    },
    update: { ...audit, updatedAt },
    create: {
      ...audit,
      pendudukId: input.pendudukId,
      field: input.field,
      updatedAt,
    },
  });
  await tx.fieldUpdateLog.create({
    data: {
      ...audit,
      pendudukId: input.pendudukId,
      field: input.field,
      createdAt: updatedAt,
    },
  });
}

import type { Prisma } from "@prisma/client";

export async function currentSurveyPeriod(tx: Prisma.TransactionClient, desaId: string) {
  const snapshot = await tx.snapshot.findFirst({
    where: { desaId },
    orderBy: { urutan: "desc" },
    select: { kode: true },
  });
  return snapshot?.kode ?? "T0";
}

export async function registerIncompleteFamily(
  tx: Prisma.TransactionClient,
  input: {
    desaId: string;
    nkk: string;
    kodeBangunan: number | null;
    stagingGroupId: string;
    userId: string;
    userName: string;
  }
) {
  const periode = await currentSurveyPeriod(tx, input.desaId);
  return tx.progresPendataanKeluarga.upsert({
    where: { desaId_nkk_periode: { desaId: input.desaId, nkk: input.nkk, periode } },
    create: {
      desaId: input.desaId,
      nkk: input.nkk,
      kodeBangunan: input.kodeBangunan,
      periode,
      status: "BELUM_LENGKAP",
      aspekTerakhir: 1,
      aspekSelesai: "[1]",
      stagingGroupId: input.stagingGroupId,
      updatedBy: input.userId,
      updatedByName: input.userName,
    },
    update: {
      kodeBangunan: input.kodeBangunan,
      status: "BELUM_LENGKAP",
      aspekTerakhir: 1,
      aspekSelesai: "[1]",
      stagingGroupId: input.stagingGroupId,
      updatedBy: input.userId,
      updatedByName: input.userName,
    },
  });
}

export async function completeFamilyProgress(
  tx: Prisma.TransactionClient,
  input: { desaId: string; nkk: string; userId: string; userName: string }
) {
  return tx.progresPendataanKeluarga.updateMany({
    where: { desaId: input.desaId, nkk: input.nkk, status: "BELUM_LENGKAP" },
    data: {
      status: "LENGKAP",
      aspekTerakhir: 6,
      aspekSelesai: "[1,2,3,4,5,6]",
      updatedBy: input.userId,
      updatedByName: input.userName,
    },
  });
}

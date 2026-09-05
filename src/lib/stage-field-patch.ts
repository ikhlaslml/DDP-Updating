import type { Prisma } from "@prisma/client";

function pendingData(value: string | null) {
  try {
    const parsed = JSON.parse(value ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export async function stageFieldPatch(
  tx: Prisma.TransactionClient,
  input: {
    desaId: string;
    groupId: string;
    resident: { id: string; nik: string | null; nama: string | null };
    data: Record<string, unknown>;
    actor: { userId: string; userName: string; userEmail: string };
    scope: "FAMILY" | "PERSON";
    ringkasan?: string;
  },
) {
  const pendingEvent = await tx.stagingChange.findFirst({
    where: {
      desaId: input.desaId,
      status: "PENDING",
      entityType: "PERISTIWA",
      OR: [
        { pendudukId: input.resident.id },
        { eventData: { contains: input.resident.id } },
      ],
    },
  });
  if (pendingEvent) throw new Error("Penduduk memiliki peristiwa yang masih menunggu penggabungan");
  const existing = await tx.stagingChange.findMany({
    where: {
      desaId: input.desaId,
      pendudukId: input.resident.id,
      status: "PENDING",
      entityType: "PENDUDUK",
      aksi: "UPDATE",
    },
    select: { data: true },
  });
  const submittedFields = Object.keys(input.data);
  if (
    existing.some((change) =>
      submittedFields.some((field) => Object.hasOwn(pendingData(change.data), field)),
    )
  ) {
    throw new Error("Salah satu kolom sudah diedit dan menunggu penggabungan");
  }
  return tx.stagingChange.create({
    data: {
      desaId: input.desaId,
      entityType: "PENDUDUK",
      groupId: input.groupId,
      aksi: "UPDATE",
      pendudukId: input.resident.id,
      nik: input.resident.nik,
      nama: input.resident.nama,
      ringkasan:
        input.ringkasan ??
        (input.scope === "FAMILY"
          ? "Pembaruan tingkat keluarga."
          : "Pembaruan data penduduk."),
      data: JSON.stringify(input.data),
      createdBy: input.actor.userId,
      createdByName: input.actor.userName,
      createdByEmail: input.actor.userEmail,
    },
  });
}

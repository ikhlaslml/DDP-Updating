import "server-only";

import { addMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { PeriodicCycle } from "@/lib/updating-columns";

export type PeriodicCellStatus = "JATUH_TEMPO" | "MENUNGGU_PENGGABUNGAN" | "TERKINI";

export type UpdatingResident = {
  id: string;
  nik: string | null;
  nkk: string | null;
  createdAt: Date;
};

type UpdatingState = {
  baselineOverride: Date | null;
  t0Date: Date | null;
  snapshotDateByNik: Map<string, Date>;
  updatedAtByCell: Map<string, Date>;
  pendingCells: Set<string>;
};

function cellKey(pendudukId: string, field: string) {
  return `${pendudukId}:${field}`;
}

function parseObject(value: string | null) {
  if (!value) return {} as Record<string, unknown>;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export async function loadUpdatingState(desaId: string, residents: UpdatingResident[]): Promise<UpdatingState> {
  const residentIds = residents.map((resident) => resident.id);
  const niks = residents.flatMap((resident) => (resident.nik ? [resident.nik] : []));
  const [settings, t0, updates, pending, snapshotRows] = await Promise.all([
    prisma.pengaturanDesa.findUnique({
      where: { desaId },
      select: { tanggalBaselineData: true },
    }),
    prisma.snapshot.findFirst({
      where: { desaId, urutan: 0 },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    residentIds.length
      ? prisma.fieldUpdate.findMany({
          where: { desaId, pendudukId: { in: residentIds } },
          select: { pendudukId: true, field: true, updatedAt: true },
        })
      : [],
    residentIds.length
      ? prisma.stagingChange.findMany({
          where: {
            desaId,
            status: "PENDING",
            entityType: "PENDUDUK",
            aksi: "UPDATE",
            pendudukId: { in: residentIds },
          },
          select: { pendudukId: true, data: true },
        })
      : [],
    niks.length
      ? prisma.snapshotPenduduk.findMany({
          where: { nik: { in: niks }, snapshot: { desaId } },
          select: { nik: true, snapshot: { select: { createdAt: true } } },
        })
      : [],
  ]);

  const snapshotDateByNik = new Map<string, Date>();
  for (const row of snapshotRows) {
    if (!row.nik) continue;
    const current = snapshotDateByNik.get(row.nik);
    if (!current || current < row.snapshot.createdAt) {
      snapshotDateByNik.set(row.nik, row.snapshot.createdAt);
    }
  }
  const updatedAtByCell = new Map(
    updates.map((update) => [cellKey(update.pendudukId, update.field), update.updatedAt]),
  );
  const pendingCells = new Set<string>();
  for (const change of pending) {
    if (!change.pendudukId) continue;
    for (const field of Object.keys(parseObject(change.data))) {
      pendingCells.add(cellKey(change.pendudukId, field));
    }
  }

  return {
    baselineOverride: settings?.tanggalBaselineData ?? null,
    t0Date: t0?.createdAt ?? null,
    snapshotDateByNik,
    updatedAtByCell,
    pendingCells,
  };
}

export function periodicCellState(
  state: UpdatingState,
  resident: UpdatingResident,
  field: string,
  cycle: PeriodicCycle,
  now = new Date(),
) {
  const key = cellKey(resident.id, field);
  const lastUpdated =
    state.updatedAtByCell.get(key) ??
    state.baselineOverride ??
    (resident.nik ? state.snapshotDateByNik.get(resident.nik) : undefined) ??
    state.t0Date ??
    resident.createdAt;
  const dueAt = addMonths(lastUpdated, cycle === "SIX_MONTHS" ? 6 : 12);
  const status: PeriodicCellStatus = state.pendingCells.has(key)
    ? "MENUNGGU_PENGGABUNGAN"
    : dueAt <= now
      ? "JATUH_TEMPO"
      : "TERKINI";
  return { status, lastUpdated, dueAt };
}

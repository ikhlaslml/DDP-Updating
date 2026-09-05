import "server-only";

import { addMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { parameterAskedTo, parameterFrequency } from "@/lib/parameter-metadata";
import { isHouseholdField } from "@/lib/survey";
import type { PeriodicCycle } from "@/lib/updating-columns";

export type PeriodicCellStatus = "JATUH_TEMPO" | "MENUNGGU_PENGGABUNGAN" | "TERKINI";

export type UpdatingResident = {
  id: string;
  nik: string | null;
  nkk: string | null;
  createdAt: Date;
  datamasuk?: Date | null;
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
    resident.datamasuk ??
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

function lastUpdatedAt(
  state: UpdatingState,
  resident: UpdatingResident,
  field: string,
) {
  const key = cellKey(resident.id, field);
  return (
    state.updatedAtByCell.get(key) ??
    state.baselineOverride ??
    resident.datamasuk ??
    (resident.nik ? state.snapshotDateByNik.get(resident.nik) : undefined) ??
    state.t0Date ??
    resident.createdAt
  );
}

export function fieldCellState(
  state: UpdatingState,
  resident: UpdatingResident,
  field: string,
  role: "HEAD" | "MEMBER",
  now = new Date(),
) {
  const key = cellKey(resident.id, field);
  const lastUpdated = lastUpdatedAt(state, resident, field);
  if (state.pendingCells.has(key)) {
    return { status: "MENUNGGU_PENGGABUNGAN" as const, lastUpdated, dueAt: lastUpdated };
  }
  const frequency = parameterFrequency(field, isHouseholdField(field) ? "HEAD" : role);
  if (frequency !== "SIX_MONTHS" && frequency !== "ANNUAL") {
    return { status: "TERKINI" as const, lastUpdated, dueAt: lastUpdated };
  }
  const dueAt = addMonths(lastUpdated, frequency === "SIX_MONTHS" ? 6 : 12);
  return {
    status: (dueAt <= now ? "JATUH_TEMPO" : "TERKINI") as PeriodicCellStatus,
    lastUpdated,
    dueAt,
  };
}

export function roleForTableField(field: string, personRole: "HEAD" | "MEMBER") {
  if (isHouseholdField(field)) return "HEAD" as const;
  return parameterAskedTo(field).includes(personRole) ? personRole : null;
}

export async function cellStatusByResident(
  desaId: string,
  residents: Array<UpdatingResident & { status_dalam_keluarga?: string | null }>,
  fields: string[],
) {
  const state = await loadUpdatingState(desaId, residents);
  const result: Record<string, Record<string, PeriodicCellStatus>> = {};
  for (const resident of residents) {
    const personRole =
      resident.status_dalam_keluarga === "Kepala Keluarga" ? "HEAD" : "MEMBER";
    result[resident.id] = {};
    for (const field of fields) {
      if (!roleForTableField(field, personRole)) continue;
      result[resident.id][field] = fieldCellState(state, resident, field, personRole).status;
    }
  }
  return result;
}

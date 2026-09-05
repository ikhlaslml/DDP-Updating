import "server-only";

import type { Penduduk } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { inputValueFromRecord } from "@/lib/format";
import { mapping } from "@/lib/indikator";
import { isConditionalFieldVisible } from "@/lib/survey";
import { periodicColumns, type PeriodicCycle } from "@/lib/updating-columns";
import {
  loadUpdatingState,
  periodicCellState,
  type PeriodicCellStatus,
} from "@/lib/updating-status";

export type PeriodicCell = {
  field: string;
  value: string;
  status: PeriodicCellStatus;
  lastUpdated: string;
  dueAt: string;
};

export type PeriodicMember = {
  id: string;
  nama: string;
  nik: string;
  role: "HEAD" | "MEMBER";
  statusDalamKeluarga: string;
  cells: PeriodicCell[];
};

export type PeriodicFamily = {
  nkk: string;
  headId: string;
  namaKepala: string;
  kodeBangunan: number | null;
  dusun: string | null;
  rw: number | null;
  rt: number | null;
  jumlahAnggota: number;
  familyCells: PeriodicCell[];
  members: PeriodicMember[];
  dueFamilyFields: number;
  dueMemberFields: number;
  waitingFields: number;
  status: PeriodicCellStatus;
};

function roleOf(resident: Penduduk): "HEAD" | "MEMBER" {
  return resident.status_dalam_keluarga === "Kepala Keluarga" ? "HEAD" : "MEMBER";
}

function valuesForConditions(resident: Penduduk) {
  return Object.fromEntries(
    Object.entries(resident).map(([field, value]) => [
      field,
      value instanceof Date ? value.toISOString().slice(0, 10) : value == null ? "" : String(value),
    ]),
  );
}

function cellFor(
  resident: Penduduk,
  field: string,
  cycle: PeriodicCycle,
  state: Awaited<ReturnType<typeof loadUpdatingState>>,
): PeriodicCell {
  const status = periodicCellState(state, resident, field, cycle);
  return {
    field,
    value: inputValueFromRecord(
      resident[field as keyof Penduduk],
      mapping.kolom[field].tipe,
    ),
    status: status.status,
    lastUpdated: status.lastUpdated.toISOString(),
    dueAt: status.dueAt.toISOString(),
  };
}

function visibleFields(resident: Penduduk, fields: string[], role: "HEAD" | "MEMBER") {
  const values = valuesForConditions(resident);
  return fields.filter((field) => isConditionalFieldVisible(field, values, role));
}

export async function loadPeriodicFamilies(
  desaId: string,
  cycle: PeriodicCycle,
): Promise<PeriodicFamily[]> {
  const residents = await prisma.penduduk.findMany({
    where: { desaId, statusAktif: true, nkk: { not: null } },
    orderBy: [{ nkk: "asc" }, { status_dalam_keluarga: "asc" }, { nama: "asc" }],
  });
  const state = await loadUpdatingState(desaId, residents);
  const columns = periodicColumns(cycle);
  const grouped = new Map<string, Penduduk[]>();
  for (const resident of residents) {
    if (!resident.nkk) continue;
    const family = grouped.get(resident.nkk) ?? [];
    family.push(resident);
    grouped.set(resident.nkk, family);
  }

  const families: PeriodicFamily[] = [];
  for (const [nkk, members] of grouped) {
    const head =
      members.find((member) => roleOf(member) === "HEAD") ??
      members[0];
    const familyCells = visibleFields(head, columns.family, "HEAD").map((field) =>
      cellFor(head, field, cycle, state),
    );
    const memberRows = members.map<PeriodicMember>((member) => {
      const role = roleOf(member);
      const fields = role === "HEAD" ? columns.head : columns.member;
      return {
        id: member.id,
        nama: member.nama ?? "Tanpa nama",
        nik: member.nik ?? "",
        role,
        statusDalamKeluarga: member.status_dalam_keluarga ?? "-",
        cells: visibleFields(member, fields, role).map((field) =>
          cellFor(member, field, cycle, state),
        ),
      };
    });
    const allCells = [...familyCells, ...memberRows.flatMap((member) => member.cells)];
    const dueFamilyFields = familyCells.filter((cell) => cell.status === "JATUH_TEMPO").length;
    const dueMemberFields = memberRows
      .flatMap((member) => member.cells)
      .filter((cell) => cell.status === "JATUH_TEMPO").length;
    const waitingFields = allCells.filter(
      (cell) => cell.status === "MENUNGGU_PENGGABUNGAN",
    ).length;
    const status: PeriodicCellStatus =
      dueFamilyFields + dueMemberFields > 0
        ? "JATUH_TEMPO"
        : waitingFields > 0
          ? "MENUNGGU_PENGGABUNGAN"
          : "TERKINI";
    families.push({
      nkk,
      headId: head.id,
      namaKepala: head.nama ?? head.nama_kepala_rumah ?? "Tanpa nama",
      kodeBangunan: head.kode_bangunan,
      dusun: head.dusun,
      rw: head.rw,
      rt: head.rt,
      jumlahAnggota: members.length,
      familyCells,
      members: memberRows,
      dueFamilyFields,
      dueMemberFields,
      waitingFields,
      status,
    });
  }
  return families;
}

export function summarizePeriodicFamilies(families: PeriodicFamily[]) {
  const dueFamilies = families.filter((family) => family.status === "JATUH_TEMPO").length;
  const dueMemberIds = new Set(
    families.flatMap((family) =>
      family.members
        .filter((member) => member.cells.some((cell) => cell.status === "JATUH_TEMPO"))
        .map((member) => member.id),
    ),
  );
  const dueFields = families.reduce(
    (total, family) => total + family.dueFamilyFields + family.dueMemberFields,
    0,
  );
  return { dueFamilies, dueMembers: dueMemberIds.size, dueFields };
}

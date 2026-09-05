import "server-only";

import { prisma } from "@/lib/prisma";
import { ALL_COLUMNS } from "@/lib/indikator";
import { buildPendudukWhere } from "@/lib/query";
import { parameterIsDeprecated } from "@/lib/parameter-metadata";
import { compareFamilyMembers, compareFamilyNkk } from "@/lib/family-order";

const COLUMN_SET = new Set(ALL_COLUMNS);

export type CensusSourceMode = "local" | "ruby";

export type CensusListInput = {
  desaId: string;
  kodeWilayah: string | null;
  searchParams: URLSearchParams;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: "asc" | "desc";
  columns: string[];
};

export type CensusListResult = {
  data: Record<string, unknown>[];
  total: number;
  source: CensusSourceMode;
};

export function selectedResidentColumns(value: string | null) {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(",")
        .map((column) => column.trim())
        .filter((column) => COLUMN_SET.has(column) && !parameterIsDeprecated(column)),
    ),
  ];
}

function localSelect(columns: string[]): Record<string, true> | undefined {
  if (!columns.length) return undefined;
  return Object.fromEntries(
    ["id", "nkk", "nama", "nik", "status_dalam_keluarga", ...columns].map((column) => [column, true]),
  ) as Record<string, true>;
}

function sortFamilyGrouped(rows: Record<string, unknown>[], direction: "asc" | "desc") {
  const sign = direction === "desc" ? -1 : 1;
  return [...rows].sort((left, right) => {
    const nkk = compareFamilyNkk(String(left.nkk ?? ""), String(right.nkk ?? ""));
    if (nkk) return nkk * sign;
    return compareFamilyMembers(
      {
        status_dalam_keluarga: typeof left.status_dalam_keluarga === "string" ? left.status_dalam_keluarga : null,
        nama: typeof left.nama === "string" ? left.nama : null,
        nik: typeof left.nik === "string" ? left.nik : null,
        id: typeof left.id === "string" ? left.id : null,
      },
      {
        status_dalam_keluarga: typeof right.status_dalam_keluarga === "string" ? right.status_dalam_keluarga : null,
        nama: typeof right.nama === "string" ? right.nama : null,
        nik: typeof right.nik === "string" ? right.nik : null,
        id: typeof right.id === "string" ? right.id : null,
      },
    );
  });
}

async function listFromLocalDatabase(input: CensusListInput): Promise<CensusListResult> {
  const where = buildPendudukWhere(input.searchParams, input.desaId);
  const familyGrouped = input.sortBy === "nkk";
  const [total, data] = await Promise.all([
    prisma.penduduk.count({ where }),
    prisma.penduduk.findMany({
      where,
      select: localSelect(input.columns),
      orderBy: familyGrouped
        ? [{ nkk: input.sortDir }, { nama: "asc" }]
        : { [input.sortBy]: input.sortDir },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ]);
  const rows = data as unknown as Record<string, unknown>[];
  return {
    data: familyGrouped ? sortFamilyGrouped(rows, input.sortDir) : rows,
    total,
    source: "local",
  };
}

function remoteEndpoint(kodeWilayah: string) {
  const baseUrl = process.env.DDP_API_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("DDP_API_BASE_URL belum dikonfigurasi");
  const pathTemplate = process.env.DDP_API_RESIDENTS_PATH ?? "/v1/desa/{kodeWilayah}/penduduk";
  const path = pathTemplate.replace("{kodeWilayah}", encodeURIComponent(kodeWilayah));
  return new URL(path, `${baseUrl}/`);
}

function normalizedRemoteRows(payload: unknown, columns: string[]) {
  if (!payload || typeof payload !== "object") throw new Error("Respons API DDP bukan objek JSON");
  const root = payload as { data?: unknown; pagination?: { total?: unknown }; total?: unknown };
  if (!Array.isArray(root.data)) throw new Error("Respons API DDP tidak memiliki array data");
  const allowed = new Set(["id", ...columns]);
  const data = root.data.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Baris API DDP ke-${index + 1} tidak valid`);
    }
    const row = item as Record<string, unknown>;
    const projected = columns.length
      ? Object.fromEntries(Object.entries(row).filter(([key]) => allowed.has(key)))
      : row;
    const id = row.id ?? row.abs_id ?? row.nik;
    if (typeof id !== "string" && typeof id !== "number") {
      throw new Error(`Baris API DDP ke-${index + 1} tidak memiliki id/abs_id/nik`);
    }
    return { ...projected, id: String(id) };
  });
  const totalValue = root.pagination?.total ?? root.total ?? data.length;
  const total = Number(totalValue);
  if (!Number.isFinite(total) || total < 0) throw new Error("Total data dari API DDP tidak valid");
  return { data, total };
}

async function listFromRubyApi(input: CensusListInput): Promise<CensusListResult> {
  if (!input.kodeWilayah) throw new Error("Tenant belum memiliki kode wilayah untuk API DDP");
  const token = process.env.DDP_API_TOKEN;
  if (!token) throw new Error("DDP_API_TOKEN belum dikonfigurasi");

  const endpoint = remoteEndpoint(input.kodeWilayah);
  const passThrough = ["q", "dusun", "rw", "rt", "jk"];
  for (const key of passThrough) {
    const value = input.searchParams.get(key);
    if (value) endpoint.searchParams.set(key, value);
  }
  endpoint.searchParams.set("page", String(input.page));
  endpoint.searchParams.set("pageSize", String(input.pageSize));
  endpoint.searchParams.set("sortBy", input.sortBy);
  endpoint.searchParams.set("sortDir", input.sortDir);
  if (input.columns.length) endpoint.searchParams.set("columns", input.columns.join(","));

  const timeoutMs = Math.min(30_000, Math.max(1_000, Number(process.env.DDP_API_TIMEOUT_MS) || 10_000));
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "X-DDP-Village-Code": input.kodeWilayah,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`API DDP merespons HTTP ${response.status}`);
  const normalized = normalizedRemoteRows(await response.json(), input.columns);
  return { ...normalized, source: "ruby" };
}

export async function listCensusResidents(input: CensusListInput): Promise<CensusListResult> {
  const mode = (process.env.DDP_DATA_SOURCE ?? "local").toLocaleLowerCase("en-US");
  if (mode === "local") return listFromLocalDatabase(input);
  if (mode === "ruby") return listFromRubyApi(input);
  throw new Error("DDP_DATA_SOURCE harus bernilai local atau ruby");
}

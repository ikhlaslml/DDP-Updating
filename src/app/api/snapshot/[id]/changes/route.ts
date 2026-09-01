import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ALL_COLUMNS, mapping } from "@/lib/indikator";
import { fieldLabel } from "@/lib/field-labels";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

type StoredRow = {
  nik: string | null;
  nkk: string | null;
  nama: string | null;
  data: string;
};

type ChangeKind = "ADDED" | "REMOVED" | "UPDATED";

const HIDDEN_FIELDS = new Set(["abs_id", "subjek"]);

function parseRecord(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : String(value).trim();
}

function rowKey(row: StoredRow, record: Record<string, unknown>) {
  const nik = text(record.nik ?? row.nik);
  if (nik) return `nik:${nik}`;

  // NIK is mandatory for all newly entered data. The fallback only keeps old
  // snapshots readable when a legacy row does not have one.
  return `legacy:${text(record.nkk ?? row.nkk)}:${text(record.nama ?? row.nama).toLocaleLowerCase("id-ID")}`;
}

function comparable(value: unknown): unknown {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) return value.map(comparable);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right, "id-ID"))
        .map(([key, item]) => [key, comparable(item)])
    );
  }
  return value;
}

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(comparable(left)) === JSON.stringify(comparable(right));
}

function rowIdentity(row: StoredRow, record: Record<string, unknown>) {
  return {
    nik: text(record.nik ?? row.nik) || null,
    nkk: text(record.nkk ?? row.nkk) || null,
    nama: text(record.nama ?? row.nama) || null,
  };
}

// Compare two immutable snapshots. This deliberately does not treat pending
// staging data as history: a period becomes historical only after it is frozen.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;

  const { id } = await params;
  const snapshot = await prisma.snapshot.findFirst({
    where: { desaId: ctx.desaId, OR: [{ id }, { kode: id }] },
    select: { id: true, kode: true, label: true, urutan: true, createdAt: true },
  });
  if (!snapshot) return NextResponse.json({ error: "Periode tidak ditemukan" }, { status: 404 });

  const previous = await prisma.snapshot.findFirst({
    where: { desaId: ctx.desaId, urutan: { lt: snapshot.urutan } },
    orderBy: { urutan: "desc" },
    select: { id: true, kode: true, label: true, urutan: true, createdAt: true },
  });

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("pageSize")) || 20));

  if (!previous) {
    return NextResponse.json({
      snapshot,
      previous: null,
      summary: { total: 0, added: 0, removed: 0, updated: 0 },
      data: [],
      pagination: { page, pageSize, total: 0, totalPages: 1 },
    });
  }

  const [currentRows, previousRows] = await Promise.all([
    prisma.snapshotPenduduk.findMany({
      where: { snapshotId: snapshot.id },
      select: { nik: true, nkk: true, nama: true, data: true },
    }),
    prisma.snapshotPenduduk.findMany({
      where: { snapshotId: previous.id },
      select: { nik: true, nkk: true, nama: true, data: true },
    }),
  ]);

  const current = new Map<string, { row: StoredRow; record: Record<string, unknown> }>();
  const prior = new Map<string, { row: StoredRow; record: Record<string, unknown> }>();
  for (const row of currentRows) {
    const record = parseRecord(row.data);
    current.set(rowKey(row, record), { row, record });
  }
  for (const row of previousRows) {
    const record = parseRecord(row.data);
    prior.set(rowKey(row, record), { row, record });
  }

  const changes: {
    key: string;
    kind: ChangeKind;
    nik: string | null;
    nkk: string | null;
    nama: string | null;
    fields: { key: string; label: string; before: unknown; after: unknown }[];
  }[] = [];

  const keys = new Set([...prior.keys(), ...current.keys()]);
  for (const key of keys) {
    const before = prior.get(key);
    const after = current.get(key);
    if (!before && after) {
      changes.push({ key, kind: "ADDED", ...rowIdentity(after.row, after.record), fields: [] });
      continue;
    }
    if (before && !after) {
      changes.push({ key, kind: "REMOVED", ...rowIdentity(before.row, before.record), fields: [] });
      continue;
    }
    if (!before || !after) continue;

    const fields = ALL_COLUMNS
      .filter((field) => !HIDDEN_FIELDS.has(field) && !sameValue(before.record[field], after.record[field]))
      .map((field) => ({
        key: field,
        label: fieldLabel(field, mapping.kolom[field]),
        before: before.record[field] ?? null,
        after: after.record[field] ?? null,
      }));
    if (fields.length) {
      changes.push({ key, kind: "UPDATED", ...rowIdentity(after.row, after.record), fields });
    }
  }

  changes.sort((left, right) => {
    const leftName = left.nama ?? "";
    const rightName = right.nama ?? "";
    return leftName.localeCompare(rightName, "id-ID") || (left.nik ?? "").localeCompare(right.nik ?? "");
  });

  const summary = changes.reduce(
    (result, change) => {
      result.total += 1;
      if (change.kind === "ADDED") result.added += 1;
      if (change.kind === "REMOVED") result.removed += 1;
      if (change.kind === "UPDATED") result.updated += 1;
      return result;
    },
    { total: 0, added: 0, removed: 0, updated: 0 }
  );
  const totalPages = Math.max(1, Math.ceil(changes.length / pageSize));
  const safePage = Math.min(page, totalPages);

  return NextResponse.json({
    snapshot,
    previous,
    summary,
    data: changes.slice((safePage - 1) * pageSize, safePage * pageSize),
    pagination: { page: safePage, pageSize, total: changes.length, totalPages },
  });
}

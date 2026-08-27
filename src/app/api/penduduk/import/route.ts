import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { ALL_COLUMNS, mapping } from "@/lib/indikator";
import { REQUIRED_FIELDS, pendudukCreateSchema, flattenZodError } from "@/lib/validation";
import { fromImportValue } from "@/lib/export-import";
import { getAuthContext, isOperator, UNAUTHORIZED, FORBIDDEN } from "@/lib/tenant";
import { readExcelTextRows } from "@/lib/excel-server";
import { normalizeVillageCode, normalizeVillageName, villageIdentityMatches } from "@/lib/village-identity";

export const runtime = "nodejs";

async function toAoa(filename: string, buf: ArrayBuffer): Promise<unknown[][]> {
  if (filename.toLowerCase().endsWith(".csv")) {
    const text = Buffer.from(buf).toString("utf-8");
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
    if (parsed.errors.length) throw new Error(`CSV tidak valid pada baris ${parsed.errors[0].row ?? "-"}`);
    if (parsed.data.length > 10_001 || parsed.data.some((row) => row.length > 300)) {
      throw new Error("Berkas melebihi batas 10.000 baris atau 300 kolom");
    }
    return parsed.data as string[][];
  }
  return readExcelTextRows(Buffer.from(buf), { maxRows: 10_001, maxColumns: 300 });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  if (!isOperator(ctx.role)) return FORBIDDEN;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }
  if (!/\.(csv|xlsx)$/i.test(file.name)) {
    return NextResponse.json({ error: "Format berkas harus CSV atau XLSX" }, { status: 415 });
  }
  if (!file.size || file.size > 10_000_000) {
    return NextResponse.json({ error: "Ukuran berkas maksimal 10 MB" }, { status: 413 });
  }

  const buf = await file.arrayBuffer();
  let aoa: unknown[][];
  try {
    aoa = await toAoa(file.name, buf);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Berkas tidak dapat dibaca" }, { status: 400 });
  }
  if (aoa.length === 0) {
    return NextResponse.json({ error: "File kosong" }, { status: 400 });
  }

  const headerRow = (aoa[0] || []).map((h) => String(h ?? "").trim());
  const dataRows = aoa.slice(1).filter((r) => r.some((c) => String(c ?? "").trim() !== ""));

  const unknownColumns = headerRow.filter((h) => h && !ALL_COLUMNS.includes(h));
  const missingRequiredColumns = [...REQUIRED_FIELDS].filter((f) => !headerRow.includes(f));

  if (missingRequiredColumns.length > 0) {
    return NextResponse.json(
      {
        error: "Header file tidak lengkap",
        missingRequiredColumns,
        unknownColumns,
      },
      { status: 400 }
    );
  }

  const knownIndexes = headerRow
    .map((h, idx) => ({ h, idx }))
    .filter(({ h }) => ALL_COLUMNS.includes(h));

  const kodeDeskelIndex = headerRow.indexOf("kode_deskel");
  const deskelIndex = headerRow.indexOf("deskel");
  if (kodeDeskelIndex === -1 && deskelIndex === -1) {
    return NextResponse.json(
      { error: "File wajib memiliki kolom kode_deskel atau deskel agar data tidak masuk ke desa yang salah." },
      { status: 400 }
    );
  }

  const currentVillage = await prisma.desa.findUnique({
    where: { id: ctx.desaId },
    select: { nama: true, kodeWilayah: true },
  });
  if (!currentVillage) return NextResponse.json({ error: "Desa akun tidak ditemukan" }, { status: 400 });

  const detectedVillages = new Set<string>();
  let villageMismatchCount = 0;
  for (const row of dataRows) {
    const kodeDeskel = kodeDeskelIndex >= 0 ? String(row[kodeDeskelIndex] ?? "").trim() : "";
    const deskel = deskelIndex >= 0 ? String(row[deskelIndex] ?? "").trim() : "";
    detectedVillages.add(normalizeVillageCode(kodeDeskel) || normalizeVillageName(deskel) || "tanpa-identitas");
    if (!villageIdentityMatches({ kodeDeskel, deskel }, currentVillage)) villageMismatchCount += 1;
  }
  if (villageMismatchCount > 0) {
    return NextResponse.json(
      {
        error: "File memuat data desa lain. Impor melalui halaman ini hanya boleh untuk desa akun yang sedang login. Gunakan alat impor awal empat desa untuk CSV gabungan.",
        villageMismatchCount,
        detectedVillageCount: detectedVillages.size,
      },
      { status: 400 }
    );
  }

  const [baselineNiks, pendingNiks] = await Promise.all([
    prisma.penduduk.findMany({ where: { desaId: ctx.desaId }, select: { nik: true } }),
    prisma.stagingChange.findMany({
      where: { desaId: ctx.desaId, entityType: "PENDUDUK", status: "PENDING", nik: { not: null } },
      select: { nik: true },
    }),
  ]);
  const existingNiks = new Set([...baselineNiks, ...pendingNiks].map((row) => row.nik));
  const seenNiksInFile = new Set<string>();

  const rowErrors: { row: number; errors: Record<string, string> }[] = [];
  const toCreate: Record<string, unknown>[] = [];

  dataRows.forEach((row, i) => {
    const rowNum = i + 2; // +1 for header, +1 for 1-indexing
    const record: Record<string, unknown> = {};
    const parseErrors: Record<string, string> = {};

    for (const { h, idx } of knownIndexes) {
      const def = mapping.kolom[h];
      const raw = String(row[idx] ?? "");
      const parsed = fromImportValue(raw, def);
      if (!parsed.ok) {
        parseErrors[h] = parsed.message;
      } else if (parsed.value !== undefined) {
        record[h] = parsed.value;
      }
    }

    if (Object.keys(parseErrors).length > 0) {
      rowErrors.push({ row: rowNum, errors: parseErrors });
      return;
    }

    const validated = pendudukCreateSchema.safeParse(record);
    if (!validated.success) {
      rowErrors.push({ row: rowNum, errors: flattenZodError(validated.error) });
      return;
    }

    const nik = validated.data.nik as string;
    if (existingNiks.has(nik) || seenNiksInFile.has(nik)) {
      rowErrors.push({ row: rowNum, errors: { nik: "NIK sudah terdaftar (duplikat)" } });
      return;
    }
    seenNiksInFile.add(nik);

    const data = { ...validated.data } as Record<string, unknown>;
    if (!data.abs_id) data.abs_id = `ABS${Date.now()}${i}${Math.floor(Math.random() * 1000)}`;
    toCreate.push(data);
  });

  if (toCreate.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (let index = 0; index < toCreate.length; index += 100) {
        await tx.stagingChange.createMany({
          data: toCreate.slice(index, index + 100).map((data) => ({
            desaId: ctx.desaId,
            entityType: "PENDUDUK",
            aksi: "CREATE",
            nik: String(data.nik),
            nama: typeof data.nama === "string" ? data.nama : null,
            ringkasan: `Impor ${file.name}: penambahan penduduk`,
            data: JSON.stringify(data),
            createdBy: ctx.userId,
            createdByName: ctx.userName,
            createdByEmail: ctx.userEmail,
          })),
        });
      }
    }, { timeout: 60_000 });
  }

  return NextResponse.json({
    totalRows: dataRows.length,
    successCount: toCreate.length,
    failCount: rowErrors.length,
    unknownColumns,
    rowErrors: rowErrors.slice(0, 200),
  });
}

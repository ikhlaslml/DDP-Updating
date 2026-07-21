import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { ALL_COLUMNS, mapping } from "@/lib/indikator";
import { REQUIRED_FIELDS, pendudukCreateSchema, flattenZodError } from "@/lib/validation";
import { fromImportValue } from "@/lib/export-import";

export const runtime = "nodejs";

function toAoa(filename: string, buf: ArrayBuffer): unknown[][] {
  if (filename.toLowerCase().endsWith(".csv")) {
    const text = Buffer.from(buf).toString("utf-8");
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
    return parsed.data as string[][];
  }
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false }) as unknown[][];
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }

  const buf = await file.arrayBuffer();
  const aoa = toAoa(file.name, buf);
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

  const existingNiks = new Set(
    (await prisma.penduduk.findMany({ select: { nik: true } })).map((r) => r.nik)
  );
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

    const data = { ...validated.data };
    if (!data.abs_id) data.abs_id = `ABS${Date.now()}${i}${Math.floor(Math.random() * 1000)}`;
    toCreate.push(data);
  });

  if (toCreate.length > 0) {
    await prisma.$transaction(toCreate.map((data) => prisma.penduduk.create({ data: data as never })));
  }

  return NextResponse.json({
    totalRows: dataRows.length,
    successCount: toCreate.length,
    failCount: rowErrors.length,
    unknownColumns,
    rowErrors: rowErrors.slice(0, 200),
  });
}

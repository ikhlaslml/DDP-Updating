import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { buildPendudukWhere } from "@/lib/query";
import { ALL_COLUMNS, columnsForKelompok, mapping, parseKelompokParam } from "@/lib/indikator";
import { selectedResidentColumns } from "@/lib/census-source";
import { toExportValue } from "@/lib/export-import";
import { fieldLabel } from "@/lib/field-labels";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";
import { writeExcelRows } from "@/lib/excel-server";

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const sp = req.nextUrl.searchParams;
  const format = sp.get("format") === "csv" ? "csv" : "xlsx";
  const where = buildPendudukWhere(sp, ctx.desaId);

  const isTemplate = sp.get("template") === "1";
  const requestedColumns = sp.has("aspek")
    ? columnsForKelompok(parseKelompokParam(sp.get("aspek")))
    : selectedResidentColumns(sp.get("columns"));
  const activeColumns = isTemplate || requestedColumns.length === 0 && !sp.has("aspek")
    ? ALL_COLUMNS
    : requestedColumns;
  const rows = isTemplate ? [] : await prisma.penduduk.findMany({
    where,
    select: Object.fromEntries(activeColumns.map((column) => [column, true])),
    orderBy: { createdAt: "asc" },
  });
  const data = rows.map((r) => {
    const record = r as unknown as Record<string, unknown>;
    return activeColumns.map((col) => toExportValue(record[col], mapping.kolom[col]));
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const baseName = isTemplate ? "template-penduduk" : `penduduk-${stamp}`;
  // Keep the import template machine-compatible, while normal exports use
  // operator-friendly names rather than raw database identifiers.
  const headers = isTemplate
    ? ALL_COLUMNS
    : activeColumns.map((column) => fieldLabel(column, mapping.kolom[column]));

  if (format === "csv") {
    const csv = Papa.unparse({ fields: headers, data });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.csv"`,
      },
    });
  }

  const buf = await writeExcelRows("Penduduk", [headers, ...data]);

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
    },
  });
}

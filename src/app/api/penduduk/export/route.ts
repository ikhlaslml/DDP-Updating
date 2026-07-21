import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { buildPendudukWhere } from "@/lib/query";
import { ALL_COLUMNS, mapping } from "@/lib/indikator";
import { toExportValue } from "@/lib/export-import";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const format = sp.get("format") === "csv" ? "csv" : "xlsx";
  const where = buildPendudukWhere(sp);

  const isTemplate = sp.get("template") === "1";
  const rows = isTemplate ? [] : await prisma.penduduk.findMany({ where, orderBy: { createdAt: "asc" } });
  const data = rows.map((r) => {
    const record = r as unknown as Record<string, unknown>;
    return ALL_COLUMNS.map((col) => toExportValue(record[col], mapping.kolom[col]));
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const baseName = isTemplate ? "template-penduduk" : `penduduk-${stamp}`;

  if (format === "csv") {
    const csv = Papa.unparse({ fields: ALL_COLUMNS, data });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.csv"`,
      },
    });
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([ALL_COLUMNS, ...data]);
  XLSX.utils.book_append_sheet(wb, ws, "Penduduk");
  const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { ALL_COLUMNS, mapping } from "@/lib/indikator";
import { toExportValue } from "@/lib/export-import";
import { fieldLabel } from "@/lib/field-labels";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";
import { writeExcelRows } from "@/lib/excel-server";
import { parameterIsDeprecated } from "@/lib/parameter-metadata";

// Export one frozen period. Snapshot rows are the authoritative source for a
// selected period; pending changes intentionally do not appear in this file.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const { id } = await params;
  const format = req.nextUrl.searchParams.get("format") === "csv" ? "csv" : "xlsx";
  const snap = await prisma.snapshot.findFirst({ where: { desaId: ctx.desaId, OR: [{ id }, { kode: id }] } });
  if (!snap) return NextResponse.json({ error: "Periode tidak ditemukan" }, { status: 404 });

  const rows = await prisma.snapshotPenduduk.findMany({
    where: { snapshotId: snap.id },
    orderBy: { nkk: "asc" },
  });
  const exportableColumns = ALL_COLUMNS.filter((column) => !parameterIsDeprecated(column));
  const data = rows.map((r) => {
    const record = JSON.parse(r.data) as Record<string, unknown>;
    return exportableColumns.map((col) => toExportValue(record[col], mapping.kolom[col]));
  });

  const headers = exportableColumns.map((column) => fieldLabel(column, mapping.kolom[column]));
  const baseName = `penduduk-${snap.kode}`;

  if (format === "csv") {
    const csv = Papa.unparse({ fields: headers, data });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.csv"`,
      },
    });
  }

  // Keep the same sheet name and header structure as the existing resident
  // export; only its data source changes to the selected frozen period.
  const buf = await writeExcelRows("Penduduk", [headers, ...data]);

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
    },
  });
}

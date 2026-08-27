import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ALL_COLUMNS, mapping } from "@/lib/indikator";
import { toExportValue } from "@/lib/export-import";
import { fieldLabel } from "@/lib/field-labels";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";
import { writeExcelRows } from "@/lib/excel-server";

// Export one frozen period to xlsx.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const { id } = await params;
  const snap = await prisma.snapshot.findFirst({ where: { desaId: ctx.desaId, OR: [{ id }, { kode: id }] } });
  if (!snap) return NextResponse.json({ error: "Periode tidak ditemukan" }, { status: 404 });

  const rows = await prisma.snapshotPenduduk.findMany({
    where: { snapshotId: snap.id },
    orderBy: { nkk: "asc" },
  });
  const data = rows.map((r) => {
    const record = JSON.parse(r.data) as Record<string, unknown>;
    return ALL_COLUMNS.map((col) => toExportValue(record[col], mapping.kolom[col]));
  });

  const headers = ALL_COLUMNS.map((column) => fieldLabel(column, mapping.kolom[column]));
  const buf = await writeExcelRows(snap.kode, [headers, ...data]);

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="riwayat-${snap.kode}.xlsx"`,
    },
  });
}

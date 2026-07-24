import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { ALL_COLUMNS, mapping } from "@/lib/indikator";
import { toExportValue } from "@/lib/export-import";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

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

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([ALL_COLUMNS, ...data]);
  XLSX.utils.book_append_sheet(wb, ws, snap.kode);
  const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="riwayat-${snap.kode}.xlsx"`,
    },
  });
}

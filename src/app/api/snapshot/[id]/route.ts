import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

// Paginated, read-only rows of one frozen period (by snapshot id or kode).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const { id } = await params;
  const snap = await prisma.snapshot.findFirst({ where: { desaId: ctx.desaId, OR: [{ id }, { kode: id }] } });
  if (!snap) return NextResponse.json({ error: "Periode tidak ditemukan" }, { status: 404 });

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(sp.get("pageSize")) || 25));
  const q = sp.get("q")?.trim();

  const where = {
    snapshotId: snap.id,
    ...(q
      ? {
          OR: [
            { nama: { contains: q } },
            { nik: { contains: q } },
            { nkk: { contains: q } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.snapshotPenduduk.count({ where }),
    prisma.snapshotPenduduk.findMany({
      where,
      orderBy: { nkk: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const data = rows.map((r) => JSON.parse(r.data) as Record<string, unknown>);

  return NextResponse.json({
    snapshot: {
      kode: snap.kode,
      label: snap.label,
      createdAt: snap.createdAt,
      jumlah: snap.jumlah,
      jumlahBangunan: snap.jumlahBangunan,
      changeCount: snap.changeCount,
      changeSummary: snap.changeSummary,
      changeActors: snap.changeActors ? JSON.parse(snap.changeActors) : [],
      createdByName: snap.createdByName,
      createdByEmail: snap.createdByEmail,
    },
    data,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
}

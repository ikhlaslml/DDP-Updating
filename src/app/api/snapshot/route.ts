import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

// List all available periods (T0, T1, ...) for the Riwayat Data selector.
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const snaps = await prisma.snapshot.findMany({ where: { desaId: ctx.desaId }, orderBy: { urutan: "asc" } });
  return NextResponse.json({
    data: snaps.map((s) => ({
      id: s.id,
      kode: s.kode,
      label: s.label,
      jumlah: s.jumlah,
      createdAt: s.createdAt,
    })),
  });
}

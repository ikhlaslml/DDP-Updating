import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

// List frozen data versions for Riwayat Data and export selectors.
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const snaps = await prisma.snapshot.findMany({ where: { desaId: ctx.desaId }, orderBy: { urutan: "asc" } });
  return NextResponse.json({
    data: snaps.map((s) => ({
      id: s.id,
      kode: s.kode,
      urutan: s.urutan,
      label: s.label,
      jumlah: s.jumlah,
      jumlahBangunan: s.jumlahBangunan,
      changeCount: s.changeCount,
      changeSummary: s.changeSummary,
      changeActors: s.changeActors ? JSON.parse(s.changeActors) : [],
      createdByName: s.createdByName,
      createdByEmail: s.createdByEmail,
      createdAt: s.createdAt,
    })),
  });
}

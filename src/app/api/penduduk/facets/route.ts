import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;

  const rows = await prisma.penduduk.findMany({
    where: { desaId: ctx.desaId, statusAktif: true },
    select: { dusun: true, rw: true, rt: true },
    distinct: ["dusun", "rw", "rt"],
  });
  const dusun = [...new Set(rows.map((r) => r.dusun).filter(Boolean))].sort() as string[];
  // rw/rt are integers in the `ajaib` schema — sort numerically.
  const rw = [...new Set(rows.map((r) => r.rw).filter((v): v is number => v != null))].sort((a, b) => a - b);
  const rt = [...new Set(rows.map((r) => r.rt).filter((v): v is number => v != null))].sort((a, b) => a - b);
  return NextResponse.json({ dusun, rw, rt });
}

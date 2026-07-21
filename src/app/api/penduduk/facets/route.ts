import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.penduduk.findMany({
    select: { dusun: true, rw: true, rt: true },
    distinct: ["dusun", "rw", "rt"],
  });
  const dusun = [...new Set(rows.map((r) => r.dusun).filter(Boolean))].sort() as string[];
  const rw = [...new Set(rows.map((r) => r.rw).filter(Boolean))].sort() as string[];
  const rt = [...new Set(rows.map((r) => r.rt).filter(Boolean))].sort() as string[];
  return NextResponse.json({ dusun, rw, rt });
}

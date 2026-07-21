import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

export function buildPendudukWhere(sp: URLSearchParams): Prisma.PendudukWhereInput {
  const q = sp.get("q")?.trim();
  const dusun = sp.get("dusun")?.trim();
  const rw = sp.get("rw")?.trim();
  const rt = sp.get("rt")?.trim();
  const jk = sp.get("jk")?.trim();
  const miskinBps = sp.get("miskin_bps");
  const miskinEkstrem = sp.get("miskin_ekstrem");

  const where: Prisma.PendudukWhereInput = {};
  if (q) {
    where.OR = [
      { nama: { contains: q } },
      { nik: { contains: q } },
      { nkk: { contains: q } },
      { alamat: { contains: q } },
    ];
  }
  if (dusun) where.dusun = dusun;
  if (rw) where.rw = rw;
  if (rt) where.rt = rt;
  if (jk) where.jk = jk;
  if (miskinBps === "true") where.miskin_bps = true;
  if (miskinBps === "false") where.miskin_bps = false;
  if (miskinEkstrem === "true") where.miskin_ekstrem = true;
  if (miskinEkstrem === "false") where.miskin_ekstrem = false;
  return where;
}

export function whereFromRequest(req: NextRequest) {
  return buildPendudukWhere(req.nextUrl.searchParams);
}

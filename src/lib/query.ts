import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

export function buildPendudukWhere(sp: URLSearchParams, desaId?: string): Prisma.PendudukWhereInput {
  const q = sp.get("q")?.trim();
  const dusun = sp.get("dusun")?.trim();
  const rw = sp.get("rw")?.trim();
  const rt = sp.get("rt")?.trim();
  const jk = sp.get("jk")?.trim();
  const miskinBps = sp.get("miskin_bps");
  const miskinEkstrem = sp.get("miskin_ekstrem");

  const where: Prisma.PendudukWhereInput = { statusAktif: true };
  if (desaId) where.desaId = desaId;
  if (q) {
    where.OR = [
      { nama: { contains: q } },
      { nik: { contains: q } },
      { nkk: { contains: q } },
      { alamat: { contains: q } },
    ];
  }
  if (dusun) where.dusun = dusun;
  // rw/rt are integers in the `ajaib` schema.
  const rwNum = rw ? Number(rw) : NaN;
  const rtNum = rt ? Number(rt) : NaN;
  if (!Number.isNaN(rwNum)) where.rw = rwNum;
  if (!Number.isNaN(rtNum)) where.rt = rtNum;
  if (jk) where.jk = jk;
  // miskin_* are "Ya"/"Tidak" strings (character varying) in the `ajaib` schema.
  if (miskinBps === "true") where.miskin_bps = "Ya";
  if (miskinBps === "false") where.miskin_bps = "Tidak";
  if (miskinEkstrem === "true") where.miskin_ekstrem = "Ya";
  if (miskinEkstrem === "false") where.miskin_ekstrem = "Tidak";
  return where;
}

export function whereFromRequest(req: NextRequest) {
  return buildPendudukWhere(req.nextUrl.searchParams);
}

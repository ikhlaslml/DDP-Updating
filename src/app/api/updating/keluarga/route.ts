import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loadPeriodicFamilies } from "@/lib/periodic-updating";
import { cycleFromSlug } from "@/lib/updating-columns";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

const querySchema = z.object({
  siklus: z.enum(["6-bulan", "1-tahun"]).default("6-bulan"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(100).optional(),
  status: z.enum(["SEMUA", "JATUH_TEMPO", "MENUNGGU_PENGGABUNGAN", "TERKINI"]).default("SEMUA"),
  dusun: z.string().trim().max(100).optional(),
  rw: z.coerce.number().int().min(0).optional(),
  rt: z.coerce.number().int().min(0).optional(),
});

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Filter pembaruan tidak valid" }, { status: 400 });
  }
  const { page, pageSize, q, status, dusun, rw, rt, siklus } = parsed.data;
  const normalizedQuery = q?.toLocaleLowerCase("id-ID");
  const allFamilies = await loadPeriodicFamilies(ctx.desaId, cycleFromSlug(siklus));
  const filtered = allFamilies.filter((family) => {
    if (status !== "SEMUA" && family.status !== status) return false;
    if (dusun && family.dusun !== dusun) return false;
    if (rw !== undefined && family.rw !== rw) return false;
    if (rt !== undefined && family.rt !== rt) return false;
    if (
      normalizedQuery &&
      ![
        family.nkk,
        family.namaKepala,
        ...family.members.flatMap((member) => [member.nama, member.nik]),
      ].some((value) => value.toLocaleLowerCase("id-ID").includes(normalizedQuery))
    ) {
      return false;
    }
    return true;
  });
  const statusRank = { JATUH_TEMPO: 0, MENUNGGU_PENGGABUNGAN: 1, TERKINI: 2 } as const;
  filtered.sort((left, right) => {
    const rank = statusRank[left.status] - statusRank[right.status];
    if (rank) return rank;
    return left.nkk.localeCompare(right.nkk, "id-ID");
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return NextResponse.json({
    summary: {
      total: filtered.length,
      dueFamilies: filtered.filter((family) => family.status === "JATUH_TEMPO").length,
      waitingFamilies: filtered.filter((family) => family.status === "MENUNGGU_PENGGABUNGAN").length,
    },
    data: filtered.slice(start, start + pageSize).map((family) => ({
      nkk: family.nkk,
      headId: family.headId,
      namaKepala: family.namaKepala,
      kodeBangunan: family.kodeBangunan,
      dusun: family.dusun,
      rw: family.rw,
      rt: family.rt,
      jumlahAnggota: family.jumlahAnggota,
      dueFamilyFields: family.dueFamilyFields,
      dueMemberFields: family.dueMemberFields,
      waitingFields: family.waitingFields,
      status: family.status,
    })),
    pagination: {
      page: safePage,
      pageSize,
      total: filtered.length,
      totalPages,
    },
    facets: {
      dusun: [...new Set(allFamilies.flatMap((family) => (family.dusun ? [family.dusun] : [])))].sort(),
      rw: [...new Set(allFamilies.flatMap((family) => (family.rw !== null ? [family.rw] : [])))].sort((a, b) => a - b),
      rt: [...new Set(allFamilies.flatMap((family) => (family.rt !== null ? [family.rt] : [])))].sort((a, b) => a - b),
    },
  });
}

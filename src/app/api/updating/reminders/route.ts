import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ALL_COLUMNS } from "@/lib/indikator";
import { isDue, parameterFrequency } from "@/lib/parameter-metadata";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const residents = await prisma.penduduk.findMany({
    where: { desaId: ctx.desaId, statusAktif: true },
    select: { id: true, createdAt: true },
  });
  const updates = await prisma.fieldUpdate.findMany({ where: { desaId: ctx.desaId } });
  const lastByField = new Map(updates.map((row) => [`${row.pendudukId}:${row.field}`, row.updatedAt]));
  const dueByFrequency = { SIX_MONTHS: new Map<string, number>(), ANNUAL: new Map<string, number>() };
  const dueResidents = { SIX_MONTHS: new Set<string>(), ANNUAL: new Set<string>() };
  const tracked = { SIX_MONTHS: 0, ANNUAL: 0 };

  for (const field of ALL_COLUMNS) {
    const frequency = parameterFrequency(field);
    if (frequency !== "SIX_MONTHS" && frequency !== "ANNUAL") continue;
    tracked[frequency] += 1;
    for (const resident of residents) {
      const lastUpdated = lastByField.get(`${resident.id}:${field}`) ?? resident.createdAt;
      if (!isDue(frequency, lastUpdated)) continue;
      dueByFrequency[frequency].set(field, (dueByFrequency[frequency].get(field) ?? 0) + 1);
      dueResidents[frequency].add(resident.id);
    }
  }

  const summarize = (frequency: "SIX_MONTHS" | "ANNUAL") => ({
    trackedFields: tracked[frequency],
    dueFields: [...dueByFrequency[frequency].values()].reduce((sum, count) => sum + count, 0),
    dueResidents: dueResidents[frequency].size,
    topFields: [...dueByFrequency[frequency].entries()].sort((left, right) => right[1] - left[1]).slice(0, 8).map(([field, count]) => ({ field, count })),
  });

  return NextResponse.json({ residentCount: residents.length, sixMonths: summarize("SIX_MONTHS"), annual: summarize("ANNUAL") });
}

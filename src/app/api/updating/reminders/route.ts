import { NextResponse } from "next/server";
import { loadPeriodicFamilies, summarizePeriodicFamilies } from "@/lib/periodic-updating";
import { periodicColumns, type PeriodicCycle } from "@/lib/updating-columns";
import { getAuthContext, UNAUTHORIZED } from "@/lib/tenant";

function summarize(
  families: Awaited<ReturnType<typeof loadPeriodicFamilies>>,
  cycle: PeriodicCycle,
) {
  const counts = new Map<string, number>();
  for (const family of families) {
    for (const cell of [
      ...family.familyCells,
      ...family.members.flatMap((member) => member.cells),
    ]) {
      if (cell.status === "JATUH_TEMPO") {
        counts.set(cell.field, (counts.get(cell.field) ?? 0) + 1);
      }
    }
  }
  const columns = periodicColumns(cycle);
  return {
    trackedFields: new Set([...columns.family, ...columns.head, ...columns.member]).size,
    ...summarizePeriodicFamilies(families),
    dueResidents: families
      .flatMap((family) => family.members)
      .filter((member) => member.cells.some((cell) => cell.status === "JATUH_TEMPO")).length,
    topFields: [...counts]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8)
      .map(([field, count]) => ({ field, count })),
  };
}

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return UNAUTHORIZED;
  const [sixMonthFamilies, annualFamilies] = await Promise.all([
    loadPeriodicFamilies(ctx.desaId, "SIX_MONTHS"),
    loadPeriodicFamilies(ctx.desaId, "ANNUAL"),
  ]);
  return NextResponse.json({
    familyCount: sixMonthFamilies.length,
    residentCount: sixMonthFamilies.reduce((total, family) => total + family.jumlahAnggota, 0),
    sixMonths: summarize(sixMonthFamilies, "SIX_MONTHS"),
    annual: summarize(annualFamilies, "ANNUAL"),
  });
}

import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import { loadPeriodicFamilies, summarizePeriodicFamilies } from "@/lib/periodic-updating";

export const periodicReminderCounts = unstable_cache(
  async (desaId: string) => {
    const [sixMonthFamilies, annualFamilies] = await Promise.all([
      loadPeriodicFamilies(desaId, "SIX_MONTHS"),
      loadPeriodicFamilies(desaId, "ANNUAL"),
    ]);
    return {
      sixMonths: summarizePeriodicFamilies(sixMonthFamilies),
      annual: summarizePeriodicFamilies(annualFamilies),
    };
  },
  ["periodic-reminder-counts-v2"],
  { revalidate: 300, tags: ["periodic-updating"] },
);

export function invalidatePeriodicUpdatingCache() {
  revalidateTag("periodic-updating", { expire: 0 });
}

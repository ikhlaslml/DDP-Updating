import { prisma } from "@/lib/prisma";

export const LEGACY_DEMO_MIN_BUILDING_CODE = 100_000;
export const DEMO_BUILDING_CODE_SLUGS = [
  "desa-setu",
  "desa-gunung-putri",
  "desa-citaringgul",
  "desa-babakan-sadeng",
] as const;

const DEMO_SLUGS = new Set<string>(DEMO_BUILDING_CODE_SLUGS);
const checked = new Set<string>();

function numberValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function payloadCodes(raw: string | null) {
  if (!raw) return [];
  try {
    const payload = JSON.parse(raw) as Record<string, unknown>;
    return ["kode", "kode_bangunan", "kodeBangunan"]
      .map((field) => numberValue(payload[field]))
      .filter((code): code is number => code !== null);
  } catch {
    return [];
  }
}

function remapPayload(raw: string | null, mapping: Map<number, number>) {
  if (!raw) return { changed: false, value: raw };
  try {
    const payload = JSON.parse(raw) as Record<string, unknown>;
    let changed = false;
    for (const field of ["kode", "kode_bangunan", "kodeBangunan"]) {
      const previous = numberValue(payload[field]);
      const next = previous === null ? undefined : mapping.get(previous);
      if (next === undefined) continue;
      payload[field] = typeof payload[field] === "string" ? String(next) : next;
      changed = true;
    }
    return { changed, value: changed ? JSON.stringify(payload) : raw };
  } catch {
    return { changed: false, value: raw };
  }
}

function remapSummary(summary: string | null, mapping: Map<number, number>) {
  if (!summary) return summary;
  let next = summary;
  for (const [before, after] of [...mapping].sort((left, right) => right[0] - left[0])) {
    next = next.replaceAll(`#${before}`, `#${after}`);
  }
  return next;
}

export async function collectTenantBuildingCodes(desaId: string) {
  const [residentRows, buildingRows, deletedBuildingRows, stagedRows] = await Promise.all([
    prisma.penduduk.findMany({
      where: { desaId, kode_bangunan: { not: null } },
      select: { kode_bangunan: true },
      distinct: ["kode_bangunan"],
    }),
    prisma.bangunan.findMany({ where: { desaId }, select: { kode: true } }),
    prisma.bangunanDihapus.findMany({ where: { desaId }, select: { kodeBangunan: true } }),
    prisma.stagingChange.findMany({ where: { desaId, status: "PENDING" }, select: { data: true } }),
  ]);
  const codes = new Set<number>();
  for (const row of residentRows) if (row.kode_bangunan !== null) codes.add(row.kode_bangunan);
  for (const row of buildingRows) codes.add(row.kode);
  for (const row of deletedBuildingRows) codes.add(row.kodeBangunan);
  for (const row of stagedRows) for (const code of payloadCodes(row.data)) codes.add(code);
  return [...codes].sort((left, right) => left - right);
}

export function shouldCompactLegacyDemoCodes(codes: number[]) {
  return codes.length > 0 && codes.every((code) => code >= LEGACY_DEMO_MIN_BUILDING_CODE);
}

export async function applyLegacyDemoBuildingCodeMapping(desaId: string, mapping: Map<number, number>) {
  await prisma.$transaction(async (tx) => {
    const pending = await tx.stagingChange.findMany({
      where: { desaId, status: "PENDING" },
      select: { id: true, data: true, ringkasan: true },
    });
    for (const [before] of mapping) {
      await tx.bangunan.updateMany({ where: { desaId, kode: before }, data: { kode: -before } });
      await tx.bangunanDihapus.updateMany({ where: { desaId, kodeBangunan: before }, data: { kodeBangunan: -before } });
    }
    for (const [before, after] of mapping) {
      await tx.penduduk.updateMany({ where: { desaId, kode_bangunan: before }, data: { kode_bangunan: after } });
      await tx.sesiPendataanBangunan.updateMany({ where: { desaId, kodeBangunan: before }, data: { kodeBangunan: after } });
      await tx.progresPendataanKeluarga.updateMany({ where: { desaId, kodeBangunan: before }, data: { kodeBangunan: after } });
      await tx.bangunan.updateMany({ where: { desaId, kode: -before }, data: { kode: after } });
      await tx.bangunanDihapus.updateMany({ where: { desaId, kodeBangunan: -before }, data: { kodeBangunan: after } });
    }
    for (const change of pending) {
      const data = remapPayload(change.data, mapping);
      const ringkasan = remapSummary(change.ringkasan, mapping);
      if (data.changed || ringkasan !== change.ringkasan) {
        await tx.stagingChange.update({
          where: { id: change.id },
          data: { data: data.value, ringkasan },
        });
      }
    }
  }, { isolationLevel: "Serializable", timeout: 60_000 });
}

export async function compactLegacyDemoBuildingCodes(desaId: string, slug?: string | null) {
  if (checked.has(desaId)) return;
  const desaSlug = slug ?? (await prisma.desa.findUnique({
    where: { id: desaId },
    select: { slug: true },
  }))?.slug;
  if (!desaSlug || !DEMO_SLUGS.has(desaSlug)) {
    checked.add(desaId);
    return;
  }

  const codes = await collectTenantBuildingCodes(desaId);
  if (!shouldCompactLegacyDemoCodes(codes)) {
    checked.add(desaId);
    return;
  }

  const mapping = new Map(codes.map((code, index) => [code, index + 1]));
  try {
    await applyLegacyDemoBuildingCodeMapping(desaId, mapping);
    checked.add(desaId);
  } catch {
    // Another instance may have compacted the same tenant first; retry later.
  }
}

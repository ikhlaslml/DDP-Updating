export function normalizeVillageCode(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export function formatVillageCode(value: unknown) {
  const digits = normalizeVillageCode(value);
  if (digits.length !== 10) return String(value ?? "").trim();
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`;
}

export function normalizeVillageName(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id-ID")
    .replace(/^\s*(desa|kelurahan)\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function villageIdentityMatches(
  source: { kodeDeskel?: unknown; deskel?: unknown },
  target: { kodeWilayah?: unknown; nama?: unknown }
) {
  const sourceCode = normalizeVillageCode(source.kodeDeskel);
  const targetCode = normalizeVillageCode(target.kodeWilayah);
  if (sourceCode && targetCode) return sourceCode === targetCode;
  const sourceName = normalizeVillageName(source.deskel);
  const targetName = normalizeVillageName(target.nama);
  return Boolean(sourceName && targetName && sourceName === targetName);
}

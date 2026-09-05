import { createHash } from "node:crypto";

export type MigrationRegion = {
  desaKelurahan: string;
  kecamatan: string;
  kabupatenKota: string;
  provinsi: string;
};

export function migrationRegionLabel(region: MigrationRegion) {
  return [
    region.desaKelurahan,
    region.kecamatan,
    region.kabupatenKota,
    region.provinsi,
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");
}

// This deterministic key is an integration identifier, not an official
// Kemendagri region code. A parent database can replace it with its own master
// code without losing the four queryable region labels.
export function generatedMigrationRegionKey(region: MigrationRegion) {
  const canonical = [
    region.provinsi,
    region.kabupatenKota,
    region.kecamatan,
    region.desaKelurahan,
  ]
    .map((value) =>
      value
        .normalize("NFKD")
        .replace(/\p{Diacritic}/gu, "")
        .trim()
        .toLocaleLowerCase("id-ID")
        .replace(/\s+/g, " "),
    )
    .join("|");
  return `AUTO-${createHash("sha256").update(canonical).digest("hex").slice(0, 16).toUpperCase()}`;
}

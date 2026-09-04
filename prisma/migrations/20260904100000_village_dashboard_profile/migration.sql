-- Administrative profile used by the operator-facing dashboard.
-- It intentionally lives on Desa, not PengaturanDesa, because letterhead copy
-- may follow a different format and must not control operational navigation.
ALTER TABLE "Desa"
ADD COLUMN "kecamatan" TEXT,
ADD COLUMN "kabupatenKota" TEXT,
ADD COLUMN "provinsi" TEXT,
ADD COLUMN "tahunPendataan" INTEGER;

-- Approved baseline metadata for the active Desa Setu pilot tenant.
UPDATE "Desa"
SET
  "kecamatan" = 'Jasinga',
  "kabupatenKota" = 'Bogor',
  "provinsi" = 'Jawa Barat',
  "tahunPendataan" = 2024
WHERE "slug" = 'desa-setu';

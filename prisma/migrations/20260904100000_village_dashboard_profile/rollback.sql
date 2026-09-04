-- Manual rollback for 20260904100000_village_dashboard_profile.
-- Run only through a reviewed database maintenance session; Prisma migrate does
-- not execute down migrations automatically.
ALTER TABLE "Desa"
DROP COLUMN "tahunPendataan",
DROP COLUMN "provinsi",
DROP COLUMN "kabupatenKota",
DROP COLUMN "kecamatan";

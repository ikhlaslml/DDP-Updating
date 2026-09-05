-- Manual rollback. This removes only metadata introduced by the migration;
-- no Penduduk census column is touched.
DROP TABLE IF EXISTS "FieldUpdateLog";

ALTER TABLE "PeristiwaKependudukan"
DROP COLUMN IF EXISTS "wilayahKodeDeskel",
DROP COLUMN IF EXISTS "wilayahProvinsi",
DROP COLUMN IF EXISTS "wilayahKabkota",
DROP COLUMN IF EXISTS "wilayahKecamatan",
DROP COLUMN IF EXISTS "wilayahDeskel";

ALTER TABLE "FieldUpdate"
DROP COLUMN IF EXISTS "catatan",
DROP COLUMN IF EXISTS "stagingChangeId",
DROP COLUMN IF EXISTS "updatedByEmail",
DROP COLUMN IF EXISTS "updatedByName",
DROP COLUMN IF EXISTS "updatedById",
DROP COLUMN IF EXISTS "source",
DROP COLUMN IF EXISTS "scope",
DROP COLUMN IF EXISTS "nkk";

ALTER TABLE "PengaturanDesa"
DROP COLUMN IF EXISTS "tanggalBaselineData";

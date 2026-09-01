ALTER TABLE "PengaturanDesa"
DROP CONSTRAINT IF EXISTS "PengaturanDesa_tandaTanganMediaAssetId_fkey";

DROP INDEX IF EXISTS "PengaturanDesa_desaId_tandaTanganMediaAssetId_idx";

ALTER TABLE "PengaturanDesa"
DROP COLUMN IF EXISTS "tandaTanganUpdatedAt",
DROP COLUMN IF EXISTS "tandaTanganMediaAssetId",
DROP COLUMN IF EXISTS "tandaTanganUrl";

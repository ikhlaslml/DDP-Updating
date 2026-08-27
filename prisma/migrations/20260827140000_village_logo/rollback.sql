ALTER TABLE "PengaturanDesa"
DROP CONSTRAINT IF EXISTS "PengaturanDesa_logoMediaAssetId_fkey";
DROP INDEX IF EXISTS "PengaturanDesa_desaId_logoMediaAssetId_idx";
ALTER TABLE "PengaturanDesa"
DROP COLUMN IF EXISTS "logoUpdatedAt",
DROP COLUMN IF EXISTS "logoMediaAssetId",
DROP COLUMN IF EXISTS "logoUrl";

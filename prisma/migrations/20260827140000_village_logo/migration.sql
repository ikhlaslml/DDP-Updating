ALTER TABLE "PengaturanDesa"
ADD COLUMN "logoUrl" TEXT,
ADD COLUMN "logoMediaAssetId" TEXT,
ADD COLUMN "logoUpdatedAt" TIMESTAMP(3);

CREATE INDEX "PengaturanDesa_desaId_logoMediaAssetId_idx"
ON "PengaturanDesa"("desaId", "logoMediaAssetId");

ALTER TABLE "PengaturanDesa"
ADD CONSTRAINT "PengaturanDesa_logoMediaAssetId_fkey"
FOREIGN KEY ("logoMediaAssetId") REFERENCES "MediaAsset"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

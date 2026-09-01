ALTER TABLE "PengaturanDesa"
ADD COLUMN "tandaTanganUrl" TEXT,
ADD COLUMN "tandaTanganMediaAssetId" TEXT,
ADD COLUMN "tandaTanganUpdatedAt" TIMESTAMP(3);

CREATE INDEX "PengaturanDesa_desaId_tandaTanganMediaAssetId_idx"
ON "PengaturanDesa"("desaId", "tandaTanganMediaAssetId");

ALTER TABLE "PengaturanDesa"
ADD CONSTRAINT "PengaturanDesa_tandaTanganMediaAssetId_fkey"
FOREIGN KEY ("tandaTanganMediaAssetId") REFERENCES "MediaAsset"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

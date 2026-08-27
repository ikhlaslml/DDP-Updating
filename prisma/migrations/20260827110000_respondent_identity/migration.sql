-- Tenant-scoped media metadata. File bytes live in private object storage.
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "desaId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "originalName" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "uploadedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- A new row is appended on every visit so period history is never overwritten.
CREATE TABLE "SesiPendataanBangunan" (
    "id" TEXT NOT NULL,
    "desaId" TEXT NOT NULL,
    "bangunanId" TEXT,
    "kodeBangunan" INTEGER NOT NULL,
    "stagingGroupId" TEXT,
    "periode" TEXT NOT NULL,
    "namaResponden" TEXT NOT NULL,
    "fotoRespondenUrl" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "enumeratorId" TEXT NOT NULL,
    "enumeratorName" TEXT NOT NULL,
    "enumeratorEmail" TEXT,
    "diisiPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SesiPendataanBangunan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaAsset_desaId_storageKey_key" ON "MediaAsset"("desaId", "storageKey");
CREATE INDEX "MediaAsset_desaId_purpose_createdAt_idx" ON "MediaAsset"("desaId", "purpose", "createdAt");
CREATE INDEX "SesiPendataanBangunan_desaId_kodeBangunan_diisiPada_idx" ON "SesiPendataanBangunan"("desaId", "kodeBangunan", "diisiPada");
CREATE INDEX "SesiPendataanBangunan_desaId_periode_idx" ON "SesiPendataanBangunan"("desaId", "periode");
CREATE INDEX "SesiPendataanBangunan_mediaAssetId_idx" ON "SesiPendataanBangunan"("mediaAssetId");
CREATE INDEX "SesiPendataanBangunan_stagingGroupId_idx" ON "SesiPendataanBangunan"("stagingGroupId");

ALTER TABLE "MediaAsset"
ADD CONSTRAINT "MediaAsset_desaId_fkey"
FOREIGN KEY ("desaId") REFERENCES "Desa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SesiPendataanBangunan"
ADD CONSTRAINT "SesiPendataanBangunan_desaId_fkey"
FOREIGN KEY ("desaId") REFERENCES "Desa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SesiPendataanBangunan"
ADD CONSTRAINT "SesiPendataanBangunan_mediaAssetId_fkey"
FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SesiPendataanBangunan"
ADD CONSTRAINT "SesiPendataanBangunan_supersedesId_fkey"
FOREIGN KEY ("supersedesId") REFERENCES "SesiPendataanBangunan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

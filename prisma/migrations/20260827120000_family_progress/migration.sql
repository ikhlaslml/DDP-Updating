CREATE TABLE "ProgresPendataanKeluarga" (
    "id" TEXT NOT NULL,
    "desaId" TEXT NOT NULL,
    "nkk" TEXT NOT NULL,
    "kodeBangunan" INTEGER,
    "periode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BELUM_LENGKAP',
    "aspekTerakhir" INTEGER NOT NULL DEFAULT 1,
    "aspekSelesai" TEXT NOT NULL DEFAULT '[1]',
    "stagingGroupId" TEXT,
    "updatedBy" TEXT NOT NULL,
    "updatedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProgresPendataanKeluarga_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProgresPendataanKeluarga_aspekTerakhir_check" CHECK ("aspekTerakhir" BETWEEN 1 AND 6),
    CONSTRAINT "ProgresPendataanKeluarga_status_check" CHECK ("status" IN ('BELUM_LENGKAP', 'LENGKAP'))
);

CREATE UNIQUE INDEX "ProgresPendataanKeluarga_desaId_nkk_periode_key" ON "ProgresPendataanKeluarga"("desaId", "nkk", "periode");
CREATE INDEX "ProgresPendataanKeluarga_desaId_kodeBangunan_status_idx" ON "ProgresPendataanKeluarga"("desaId", "kodeBangunan", "status");
CREATE INDEX "ProgresPendataanKeluarga_stagingGroupId_idx" ON "ProgresPendataanKeluarga"("stagingGroupId");

ALTER TABLE "ProgresPendataanKeluarga"
ADD CONSTRAINT "ProgresPendataanKeluarga_desaId_fkey"
FOREIGN KEY ("desaId") REFERENCES "Desa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

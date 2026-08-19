ALTER TABLE "SuratTerbit"
ADD COLUMN "peristiwaId" TEXT,
ADD COLUMN "jenisPeristiwa" TEXT;

CREATE INDEX "SuratTerbit_desaId_peristiwaId_idx"
ON "SuratTerbit"("desaId", "peristiwaId");

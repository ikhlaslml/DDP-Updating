ALTER TABLE "SuratTerbit"
ADD COLUMN "tahunNomor" INTEGER,
ADD COLUMN "urutanNomor" INTEGER,
ADD COLUMN "isiSnapshot" TEXT,
ADD COLUMN "pengaturanSnapshot" TEXT,
ADD COLUMN "wargaSnapshot" TEXT,
ADD COLUMN "issuedBy" TEXT,
ADD COLUMN "issuedByName" TEXT,
ADD COLUMN "issuedByEmail" TEXT;

-- Give existing letters deterministic per-tenant/year positions without
-- rewriting their historical nomor text.
WITH ranked AS (
  SELECT "id",
         EXTRACT(YEAR FROM "createdAt")::INTEGER AS year_value,
         ROW_NUMBER() OVER (
           PARTITION BY "desaId", EXTRACT(YEAR FROM "createdAt")
           ORDER BY "createdAt", "id"
         )::INTEGER AS sequence_value
  FROM "SuratTerbit"
  WHERE "desaId" IS NOT NULL
)
UPDATE "SuratTerbit" AS surat
SET "tahunNomor" = ranked.year_value,
    "urutanNomor" = ranked.sequence_value
FROM ranked
WHERE surat."id" = ranked."id";

CREATE UNIQUE INDEX "SuratTerbit_desaId_tahunNomor_urutanNomor_key"
ON "SuratTerbit"("desaId", "tahunNomor", "urutanNomor");

CREATE TABLE "NomorSuratCounter" (
    "id" TEXT NOT NULL,
    "desaId" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "nomorTerakhir" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NomorSuratCounter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NomorSuratCounter_desaId_tahun_key" ON "NomorSuratCounter"("desaId", "tahun");

INSERT INTO "NomorSuratCounter" ("id", "desaId", "tahun", "nomorTerakhir", "updatedAt")
SELECT 'counter-' || md5("desaId" || '-' || "tahunNomor"::TEXT),
       "desaId",
       "tahunNomor",
       MAX("urutanNomor"),
       CURRENT_TIMESTAMP
FROM "SuratTerbit"
WHERE "desaId" IS NOT NULL AND "tahunNomor" IS NOT NULL AND "urutanNomor" IS NOT NULL
GROUP BY "desaId", "tahunNomor";

ALTER TABLE "NomorSuratCounter"
ADD CONSTRAINT "NomorSuratCounter_desaId_fkey"
FOREIGN KEY ("desaId") REFERENCES "Desa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE IF EXISTS "NomorSuratCounter";
DROP INDEX IF EXISTS "SuratTerbit_desaId_tahunNomor_urutanNomor_key";
ALTER TABLE "SuratTerbit"
DROP COLUMN IF EXISTS "tahunNomor",
DROP COLUMN IF EXISTS "urutanNomor",
DROP COLUMN IF EXISTS "isiSnapshot",
DROP COLUMN IF EXISTS "pengaturanSnapshot",
DROP COLUMN IF EXISTS "wargaSnapshot",
DROP COLUMN IF EXISTS "issuedBy",
DROP COLUMN IF EXISTS "issuedByName",
DROP COLUMN IF EXISTS "issuedByEmail";

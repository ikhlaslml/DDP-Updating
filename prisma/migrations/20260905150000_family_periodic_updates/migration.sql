-- Additive contract for family-based periodic updates. No census column is
-- removed so this migration remains compatible with the parent DDP database.
ALTER TABLE "PengaturanDesa"
ADD COLUMN IF NOT EXISTS "tanggalBaselineData" TIMESTAMP(3);

ALTER TABLE "FieldUpdate"
ADD COLUMN IF NOT EXISTS "nkk" TEXT,
ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'PERSON',
ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'EDIT',
ADD COLUMN IF NOT EXISTS "updatedById" TEXT,
ADD COLUMN IF NOT EXISTS "updatedByName" TEXT,
ADD COLUMN IF NOT EXISTS "updatedByEmail" TEXT,
ADD COLUMN IF NOT EXISTS "stagingChangeId" TEXT,
ADD COLUMN IF NOT EXISTS "catatan" TEXT;

ALTER TABLE "PeristiwaKependudukan"
ADD COLUMN IF NOT EXISTS "wilayahDeskel" TEXT,
ADD COLUMN IF NOT EXISTS "wilayahKecamatan" TEXT,
ADD COLUMN IF NOT EXISTS "wilayahKabkota" TEXT,
ADD COLUMN IF NOT EXISTS "wilayahProvinsi" TEXT,
ADD COLUMN IF NOT EXISTS "wilayahKodeDeskel" TEXT;

CREATE TABLE IF NOT EXISTS "FieldUpdateLog" (
    "id" TEXT NOT NULL,
    "desaId" TEXT NOT NULL,
    "pendudukId" TEXT NOT NULL,
    "nkk" TEXT,
    "field" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedByName" TEXT,
    "updatedByEmail" TEXT,
    "stagingChangeId" TEXT,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FieldUpdateLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FieldUpdate_desaId_nkk_scope_field_idx"
ON "FieldUpdate"("desaId", "nkk", "scope", "field");
CREATE INDEX IF NOT EXISTS "FieldUpdate_stagingChangeId_idx"
ON "FieldUpdate"("stagingChangeId");
CREATE INDEX IF NOT EXISTS "FieldUpdateLog_desaId_field_createdAt_idx"
ON "FieldUpdateLog"("desaId", "field", "createdAt");
CREATE INDEX IF NOT EXISTS "FieldUpdateLog_desaId_nkk_scope_idx"
ON "FieldUpdateLog"("desaId", "nkk", "scope");
CREATE INDEX IF NOT EXISTS "FieldUpdateLog_pendudukId_idx"
ON "FieldUpdateLog"("pendudukId");
CREATE INDEX IF NOT EXISTS "FieldUpdateLog_stagingChangeId_idx"
ON "FieldUpdateLog"("stagingChangeId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FieldUpdate_scope_check'
  ) THEN
    ALTER TABLE "FieldUpdate"
    ADD CONSTRAINT "FieldUpdate_scope_check" CHECK ("scope" IN ('FAMILY', 'PERSON'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FieldUpdate_source_check'
  ) THEN
    ALTER TABLE "FieldUpdate"
    ADD CONSTRAINT "FieldUpdate_source_check" CHECK ("source" IN ('EDIT', 'CONFIRMED_NO_CHANGE'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FieldUpdateLog_scope_check'
  ) THEN
    ALTER TABLE "FieldUpdateLog"
    ADD CONSTRAINT "FieldUpdateLog_scope_check" CHECK ("scope" IN ('FAMILY', 'PERSON'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FieldUpdateLog_source_check'
  ) THEN
    ALTER TABLE "FieldUpdateLog"
    ADD CONSTRAINT "FieldUpdateLog_source_check" CHECK ("source" IN ('EDIT', 'CONFIRMED_NO_CHANGE'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FieldUpdateLog_desaId_fkey'
  ) THEN
    ALTER TABLE "FieldUpdateLog"
    ADD CONSTRAINT "FieldUpdateLog_desaId_fkey"
    FOREIGN KEY ("desaId") REFERENCES "Desa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Penduduk"
ADD COLUMN "statusAktif" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "inactiveReason" TEXT,
ADD COLUMN "inactiveAt" TIMESTAMP(3);

ALTER TABLE "StagingChange"
ADD COLUMN "eventType" TEXT,
ADD COLUMN "eventData" TEXT;

CREATE TABLE "Kematian" (
    "id" TEXT NOT NULL,
    "desaId" TEXT,
    "pendudukIdAsal" TEXT,
    "nik" TEXT,
    "nkk" TEXT,
    "nama" TEXT,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "penyebab" TEXT,
    "punyaAkta" TEXT,
    "nomorAkta" TEXT,
    "dataPenduduk" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdByName" TEXT,
    "createdByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Kematian_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PeristiwaKependudukan" (
    "id" TEXT NOT NULL,
    "desaId" TEXT,
    "jenis" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "pendudukId" TEXT,
    "nik" TEXT,
    "nkk" TEXT,
    "nama" TEXT,
    "data" TEXT,
    "createdBy" TEXT,
    "createdByName" TEXT,
    "createdByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PeristiwaKependudukan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FieldUpdate" (
    "id" TEXT NOT NULL,
    "desaId" TEXT,
    "pendudukId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FieldUpdate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Penduduk_desaId_statusAktif_idx" ON "Penduduk"("desaId", "statusAktif");
CREATE INDEX "Kematian_desaId_tanggal_idx" ON "Kematian"("desaId", "tanggal");
CREATE INDEX "Kematian_nik_idx" ON "Kematian"("nik");
CREATE INDEX "Kematian_nkk_idx" ON "Kematian"("nkk");
CREATE INDEX "PeristiwaKependudukan_desaId_jenis_tanggal_idx" ON "PeristiwaKependudukan"("desaId", "jenis", "tanggal");
CREATE INDEX "PeristiwaKependudukan_pendudukId_idx" ON "PeristiwaKependudukan"("pendudukId");
CREATE INDEX "FieldUpdate_desaId_field_updatedAt_idx" ON "FieldUpdate"("desaId", "field", "updatedAt");
CREATE UNIQUE INDEX "FieldUpdate_pendudukId_field_key" ON "FieldUpdate"("pendudukId", "field");

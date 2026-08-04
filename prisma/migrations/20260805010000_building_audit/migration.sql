-- CreateTable
CREATE TABLE "Bangunan" (
    "id" TEXT NOT NULL,
    "desaId" TEXT,
    "kode" INTEGER NOT NULL,
    "jenis" TEXT NOT NULL,
    "kategori" TEXT,
    "keterangan" TEXT,
    "fotoUrl" TEXT,
    "polygon" TEXT NOT NULL,
    "centroidLat" DOUBLE PRECISION NOT NULL,
    "centroidLng" DOUBLE PRECISION NOT NULL,
    "dusun" TEXT,
    "rw" INTEGER,
    "rt" INTEGER,
    "alamat" TEXT,
    "createdBy" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bangunan_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Desa"
ADD COLUMN "kodeWilayah" TEXT,
ADD COLUMN "droneTilePrefix" TEXT,
ADD COLUMN "centerLat" DOUBLE PRECISION,
ADD COLUMN "centerLng" DOUBLE PRECISION;

-- Preserve the spatial-layer code for existing tenants. Before this migration
-- it only existed on denormalized resident rows.
UPDATE "Desa" AS desa
SET "kodeWilayah" = source."kodeWilayah"
FROM (
    SELECT "desaId", MIN("kode_deskel") AS "kodeWilayah"
    FROM "Penduduk"
    WHERE "desaId" IS NOT NULL AND "kode_deskel" IS NOT NULL
    GROUP BY "desaId"
) AS source
WHERE desa."id" = source."desaId" AND desa."kodeWilayah" IS NULL;

-- AlterTable
ALTER TABLE "Snapshot"
ADD COLUMN "jumlahBangunan" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "changeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "changeSummary" TEXT,
ADD COLUMN "changeActors" TEXT,
ADD COLUMN "createdBy" TEXT,
ADD COLUMN "createdByName" TEXT,
ADD COLUMN "createdByEmail" TEXT;

-- Existing snapshots predate the building registry. Use the legacy building
-- codes as their initial count instead of displaying zero in Riwayat Data.
UPDATE "Snapshot" AS snapshot
SET "jumlahBangunan" = source."jumlahBangunan"
FROM (
    SELECT "snapshotId", COUNT(DISTINCT NULLIF(("data"::jsonb ->> 'kode_bangunan'), ''))::INTEGER AS "jumlahBangunan"
    FROM "SnapshotPenduduk"
    GROUP BY "snapshotId"
) AS source
WHERE snapshot."id" = source."snapshotId";

-- CreateTable
CREATE TABLE "SnapshotBangunan" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "kode" INTEGER NOT NULL,
    "jenis" TEXT NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "SnapshotBangunan_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "StagingChange"
ADD COLUMN "entityType" TEXT NOT NULL DEFAULT 'PENDUDUK',
ADD COLUMN "groupId" TEXT,
ADD COLUMN "createdByName" TEXT,
ADD COLUMN "createdByEmail" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Bangunan_desaId_kode_key" ON "Bangunan"("desaId", "kode");
CREATE INDEX "Bangunan_desaId_idx" ON "Bangunan"("desaId");
CREATE INDEX "Bangunan_desaId_jenis_idx" ON "Bangunan"("desaId", "jenis");
CREATE INDEX "SnapshotBangunan_snapshotId_idx" ON "SnapshotBangunan"("snapshotId");
CREATE INDEX "SnapshotBangunan_kode_idx" ON "SnapshotBangunan"("kode");
CREATE INDEX "StagingChange_desaId_groupId_idx" ON "StagingChange"("desaId", "groupId");

-- AddForeignKey
ALTER TABLE "SnapshotBangunan"
ADD CONSTRAINT "SnapshotBangunan_snapshotId_fkey"
FOREIGN KEY ("snapshotId") REFERENCES "Snapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

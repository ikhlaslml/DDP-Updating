-- Physical-building tombstones. This is intentionally separate from Penduduk:
-- demolishing/clearing a building must not delete family or resident history.
CREATE TABLE "BangunanDihapus" (
    "id" TEXT NOT NULL,
    "desaId" TEXT NOT NULL,
    "kodeBangunan" INTEGER NOT NULL,
    "alasan" TEXT NOT NULL,
    "keterangan" TEXT,
    "stagingChangeId" TEXT,
    "deletedBy" TEXT NOT NULL,
    "deletedByName" TEXT,
    "deletedByEmail" TEXT,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BangunanDihapus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BangunanDihapus_desaId_kodeBangunan_key"
ON "BangunanDihapus"("desaId", "kodeBangunan");
CREATE INDEX "BangunanDihapus_desaId_deletedAt_idx"
ON "BangunanDihapus"("desaId", "deletedAt");
CREATE INDEX "BangunanDihapus_stagingChangeId_idx"
ON "BangunanDihapus"("stagingChangeId");

ALTER TABLE "BangunanDihapus"
ADD CONSTRAINT "BangunanDihapus_desaId_fkey"
FOREIGN KEY ("desaId") REFERENCES "Desa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

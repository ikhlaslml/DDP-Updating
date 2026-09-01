-- Manual rollback for this additive migration. Prisma Migrate does not run
-- rollback scripts automatically; execute only after confirming no active
-- deployment relies on building tombstones.
DROP TABLE "BangunanDihapus";

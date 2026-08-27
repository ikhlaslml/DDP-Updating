-- Run manually only when rolling this feature back. This deletes respondent
-- visit metadata; object files should be archived/deleted separately.
DROP TABLE IF EXISTS "SesiPendataanBangunan";
DROP TABLE IF EXISTS "MediaAsset";

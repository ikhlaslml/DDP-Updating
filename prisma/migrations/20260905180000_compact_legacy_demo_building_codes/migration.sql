-- One-time remap of dummy building codes (>= 100000) to 1..N per village.
-- A tenant is skipped if any live code is already below 100000 (mixed/real data).
-- Snapshot rows stay immutable.

CREATE TABLE "_BuildingCodeSeen" (
    "desaId" TEXT NOT NULL,
    "kode" INTEGER NOT NULL,
    CONSTRAINT "_BuildingCodeSeen_pkey" PRIMARY KEY ("desaId", "kode")
);

INSERT INTO "_BuildingCodeSeen" ("desaId", "kode")
SELECT "desaId", "kode_bangunan"
FROM "Penduduk"
WHERE "desaId" IS NOT NULL AND "kode_bangunan" IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO "_BuildingCodeSeen" ("desaId", "kode")
SELECT "desaId", "kode"
FROM "Bangunan"
WHERE "desaId" IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO "_BuildingCodeSeen" ("desaId", "kode")
SELECT "desaId", "kodeBangunan"
FROM "BangunanDihapus"
ON CONFLICT DO NOTHING;

DO $$
DECLARE
    rec RECORD;
    body jsonb;
    field text;
    value text;
    parsed integer;
BEGIN
    FOR rec IN
        SELECT "desaId", data
        FROM "StagingChange"
        WHERE status = 'PENDING'
          AND "desaId" IS NOT NULL
          AND data IS NOT NULL
          AND data <> ''
    LOOP
        BEGIN
            body := rec.data::jsonb;
        EXCEPTION WHEN others THEN
            CONTINUE;
        END;

        FOREACH field IN ARRAY ARRAY['kode', 'kode_bangunan', 'kodeBangunan'] LOOP
            IF body ? field THEN
                value := body ->> field;
                IF value ~ '^-?\d+$' THEN
                    parsed := value::integer;
                    INSERT INTO "_BuildingCodeSeen" ("desaId", "kode")
                    VALUES (rec."desaId", parsed)
                    ON CONFLICT DO NOTHING;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END $$;

CREATE TABLE "_BuildingCodeRemap" (
    "desaId" TEXT NOT NULL,
    "oldKode" INTEGER NOT NULL,
    "newKode" INTEGER NOT NULL,
    CONSTRAINT "_BuildingCodeRemap_pkey" PRIMARY KEY ("desaId", "oldKode")
);

INSERT INTO "_BuildingCodeRemap" ("desaId", "oldKode", "newKode")
SELECT
    c."desaId",
    c."kode",
    ROW_NUMBER() OVER (PARTITION BY c."desaId" ORDER BY c."kode")::integer
FROM "_BuildingCodeSeen" c
INNER JOIN (
    SELECT "desaId"
    FROM "_BuildingCodeSeen"
    GROUP BY "desaId"
    HAVING MIN("kode") >= 100000
) eligible ON eligible."desaId" = c."desaId";

UPDATE "Bangunan" AS building
SET "kode" = -remap."oldKode"
FROM "_BuildingCodeRemap" AS remap
WHERE building."desaId" = remap."desaId"
  AND building."kode" = remap."oldKode";

UPDATE "BangunanDihapus" AS building
SET "kodeBangunan" = -remap."oldKode"
FROM "_BuildingCodeRemap" AS remap
WHERE building."desaId" = remap."desaId"
  AND building."kodeBangunan" = remap."oldKode";

UPDATE "Penduduk" AS resident
SET "kode_bangunan" = remap."newKode"
FROM "_BuildingCodeRemap" AS remap
WHERE resident."desaId" = remap."desaId"
  AND resident."kode_bangunan" = remap."oldKode";

UPDATE "SesiPendataanBangunan" AS session
SET "kodeBangunan" = remap."newKode"
FROM "_BuildingCodeRemap" AS remap
WHERE session."desaId" = remap."desaId"
  AND session."kodeBangunan" = remap."oldKode";

UPDATE "ProgresPendataanKeluarga" AS progress
SET "kodeBangunan" = remap."newKode"
FROM "_BuildingCodeRemap" AS remap
WHERE progress."desaId" = remap."desaId"
  AND progress."kodeBangunan" = remap."oldKode";

UPDATE "Bangunan" AS building
SET "kode" = remap."newKode"
FROM "_BuildingCodeRemap" AS remap
WHERE building."desaId" = remap."desaId"
  AND building."kode" = -remap."oldKode";

UPDATE "BangunanDihapus" AS building
SET "kodeBangunan" = remap."newKode"
FROM "_BuildingCodeRemap" AS remap
WHERE building."desaId" = remap."desaId"
  AND building."kodeBangunan" = -remap."oldKode";

DO $$
DECLARE
    rec RECORD;
    body jsonb;
    changed boolean;
    field text;
    value text;
    parsed integer;
    mapped integer;
    summary text;
    maprec RECORD;
BEGIN
    FOR rec IN
        SELECT s.id, s."desaId", s.data, s.ringkasan
        FROM "StagingChange" s
        WHERE s.status = 'PENDING'
          AND s."desaId" IN (SELECT DISTINCT "desaId" FROM "_BuildingCodeRemap")
    LOOP
        IF rec.data IS NOT NULL AND rec.data <> '' THEN
            BEGIN
                body := rec.data::jsonb;
                changed := false;
                FOREACH field IN ARRAY ARRAY['kode', 'kode_bangunan', 'kodeBangunan'] LOOP
                    IF body ? field THEN
                        value := body ->> field;
                        IF value ~ '^-?\d+$' THEN
                            parsed := value::integer;
                            SELECT remap."newKode" INTO mapped
                            FROM "_BuildingCodeRemap" AS remap
                            WHERE remap."desaId" = rec."desaId"
                              AND remap."oldKode" = parsed;
                            IF mapped IS NOT NULL THEN
                                IF jsonb_typeof(body -> field) = 'string' THEN
                                    body := jsonb_set(body, ARRAY[field], to_jsonb(mapped::text));
                                ELSE
                                    body := jsonb_set(body, ARRAY[field], to_jsonb(mapped));
                                END IF;
                                changed := true;
                            END IF;
                        END IF;
                    END IF;
                END LOOP;
                IF changed THEN
                    UPDATE "StagingChange"
                    SET data = body::text
                    WHERE id = rec.id;
                END IF;
            EXCEPTION WHEN others THEN
                NULL;
            END;
        END IF;

        IF rec.ringkasan IS NOT NULL THEN
            summary := rec.ringkasan;
            FOR maprec IN
                SELECT "oldKode", "newKode"
                FROM "_BuildingCodeRemap"
                WHERE "desaId" = rec."desaId"
                ORDER BY "oldKode" DESC
            LOOP
                summary := replace(summary, '#' || maprec."oldKode", '#' || maprec."newKode");
            END LOOP;
            IF summary IS DISTINCT FROM rec.ringkasan THEN
                UPDATE "StagingChange"
                SET ringkasan = summary
                WHERE id = rec.id;
            END IF;
        END IF;
    END LOOP;
END $$;

DROP TABLE "_BuildingCodeRemap";
DROP TABLE "_BuildingCodeSeen";

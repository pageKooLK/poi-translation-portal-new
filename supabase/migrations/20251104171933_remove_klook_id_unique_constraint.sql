-- Remove unique constraint on klook_poi_id to allow duplicate Klook IDs for re-translation
-- This allows the same POI to be re-translated multiple times

-- Drop the unique constraint
ALTER TABLE "public"."pois" DROP CONSTRAINT IF EXISTS "pois_klook_poi_id_key";

-- Drop the unique index
DROP INDEX IF EXISTS "public"."pois_klook_poi_id_key";

-- Keep the regular index for performance (non-unique)
-- The idx_pois_klook_id index should remain for query performance

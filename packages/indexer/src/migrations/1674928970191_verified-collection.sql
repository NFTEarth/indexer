-- Up Migration
ALTER TABLE "collections"
  ADD COLUMN IF NOT EXISTS "verified" bool NOT NULL DEFAULT false;
-- Down Migration
ALTER TABLE "collections"
  ALTER TABLE "verified" DROP COLUMN IF EXISTS "verified";
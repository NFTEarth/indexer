-- Up Migration
ALTER TABLE "public"."collections"
  ADD COLUMN "verified" bool NOT NULL DEFAULT false;
-- Down Migration
ALTER TABLE "public"."collections"
  ALTER TABLE "verified" DROP COLUMN "verified";
-- Up Migration
ALTER TABLE "collections" ADD COLUMN "creator" BYTEA;
-- Down Migration
ALTER TABLE "tokens" DROP COLUMN "creator";
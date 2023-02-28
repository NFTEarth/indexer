-- Up Migration
ALTER TABLE "launchpad_contract" ADD COLUMN "allowlists" JSONB;
-- Down Migration
ALTER TABLE "launchpad_contract" DROP COLUMN "allowlists";
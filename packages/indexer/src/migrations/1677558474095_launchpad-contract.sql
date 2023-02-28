-- Up Migration
CREATE TABLE "launchpad_contract" (
  "id" text NOT NULL,
  "contract" bytea,
  "bytecode" text,
  "constructor_args" text,
  "deployer" bytea,
  "verified" bool,
  PRIMARY KEY ("id")
);
-- Down Migration
DROP TABLE "launchpad_contract";
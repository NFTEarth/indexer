-- Up Migration
CREATE TABLE "explicit_attribute" (
  "contract" BYTEA NOT NULL,
  "token_id" NUMERIC(78, 0) NOT NULL,
  "attribute_id" BIGINT NOT NULL,
  "collection_id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL
);

ALTER TABLE "explicit_attribute"
  ADD CONSTRAINT "explicit_attribute_pk"
  PRIMARY KEY ("contract", "token_id", "attribute_id");

CREATE INDEX "explicit_attribute_contract_token"
  ON "explicit_attribute" ("contract", "token_id", "attribute_id");

-- Down Migration

DROP TABLE "explicit_attribute";
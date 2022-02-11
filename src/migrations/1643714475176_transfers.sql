-- Up Migration

CREATE TABLE "nft_transfer_events" (
  "address" BYTEA NOT NULL,
  "block" INT NOT NULL,
  "block_hash" BYTEA NOT NULL,
  "tx_hash" BYTEA NOT NULL,
  "tx_index" INT NOT NULL,
  "log_index" INT NOT NULL,
  "timestamp" INT NOT NULL,
  "from" BYTEA NOT NULL,
  "to" BYTEA NOT NULL,
  "token_id" NUMERIC(78, 0) NOT NULL,
  "amount" NUMERIC(78, 0) NOT NULL
);

ALTER TABLE "nft_transfer_events"
  ADD CONSTRAINT "nft_transfer_events_pk"
  PRIMARY KEY ("block_hash", "tx_hash", "log_index");

CREATE INDEX "nft_transfer_events_block_index"
  ON "nft_transfer_events" ("block" DESC);

CREATE INDEX "nft_transfer_events_address_token_id_index"
  ON "nft_transfer_events" ("address", "token_id");

CREATE TABLE "ft_transfer_events" (
  "address" BYTEA NOT NULL,
  "block" INT NOT NULL,
  "block_hash" BYTEA NOT NULL,
  "tx_hash" BYTEA NOT NULL,
  "tx_index" INT NOT NULL,
  "log_index" INT NOT NULL,
  "timestamp" INT NOT NULL,
  "from" BYTEA NOT NULL,
  "to" BYTEA NOT NULL,
  "amount" NUMERIC(78, 0) NOT NULL
);

ALTER TABLE "ft_transfer_events"
  ADD CONSTRAINT "ft_transfer_events_pk"
  PRIMARY KEY ("block_hash", "tx_hash", "log_index");

CREATE INDEX "ft_transfer_events_block_index"
  ON "ft_transfer_events" ("block" DESC);

-- Down Migration

DROP TABLE "ft_transfer_events";

DROP TABLE "nft_transfer_events";
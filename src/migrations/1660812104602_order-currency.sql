-- Up Migration

ALTER TABLE "orders" ADD COLUMN "currency" BYTEA NOT NULL DEFAULT ('\x0000000000000000000000000000000000000000');
ALTER TABLE "orders" ADD COLUMN "currency_price" NUMERIC(78, 0);
ALTER TABLE "orders" ADD COLUMN "currency_value" NUMERIC(78, 0);
ALTER TABLE "orders" ADD COLUMN "needs_conversion" BOOLEAN;

ALTER TABLE "tokens" ADD COLUMN "floor_sell_currency" BYTEA NOT NULL DEFAULT ('\x0000000000000000000000000000000000000000');
ALTER TABLE "tokens" ADD COLUMN "floor_sell_currency_value" NUMERIC(78, 0);

-- Down Migration

ALTER TABLE "tokens" DROP COLUMN "floor_sell_currency_value";
ALTER TABLE "tokens" DROP COLUMN "floor_sell_currency";

ALTER TABLE "orders" DROP COLUMN "needs_conversion";
ALTER TABLE "orders" DROP COLUMN "currency_value";
ALTER TABLE "orders" DROP COLUMN "currency_price";
ALTER TABLE "orders" DROP COLUMN "currency";

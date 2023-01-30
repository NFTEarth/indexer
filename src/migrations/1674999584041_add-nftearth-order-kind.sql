-- Up Migration

ALTER TYPE "order_kind_t" ADD VALUE IF NOT EXISTS 'nftearth';

-- Down Migration
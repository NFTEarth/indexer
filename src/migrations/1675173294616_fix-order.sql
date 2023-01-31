-- Up Migration
UPDATE orders SET kind = 'nftearth' WHERE source_id='0x06f0a8f8ecbbfa9599e29a52c0e191aed31cb2fe';
-- Down Migration
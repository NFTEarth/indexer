-- Up Migration
UPDATE orders SET kind = 'nftearth', conduit='\xFA29f9A402157672C2F608d193526A00C6B429Af', contract='\x0f9b80fc3c8b9123d0aef43df58ebdbc034a8901' WHERE source_id='0x06f0a8f8ecbbfa9599e29a52c0e191aed31cb2fe';
-- Down Migration
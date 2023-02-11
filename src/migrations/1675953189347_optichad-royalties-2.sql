-- Up Migration
UPDATE collections SET royalties = '[{"recipient": "0x7b91FA01Dc8Cb3bC55E1781163f5aEaed6747d10","bps":500}]' WHERE contract = '\x9b9f542456ad12796ccb8eb6644f29e3314e68e1';
-- Down Migration
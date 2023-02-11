-- Up Migration
UPDATE collections SET royalties = '[{"recipient": "0xa6028b948dea97B7Fb0E472e19c9D4E160ed2902","bps":500}]' WHERE contract = '\x52782699900DF91B58eCD618e77847C5774dCD2e';
-- Down Migration

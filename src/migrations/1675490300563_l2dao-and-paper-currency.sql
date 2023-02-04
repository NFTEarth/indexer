-- Up Migration
INSERT INTO currencies (
                  contract,
                  name,
                  symbol,
                  decimals,
                  metadata
                ) VALUES (
                  '\xd52f94df742a6f4b4c8b033369fe13a41782bf44',
                  'L2DAO',
                  'L2DAO',
                  18,
                  '{"coingeckoCurrencyId": "optimistic-ethereum", "image": "https://assets.coingecko.com/coins/images/23699/thumb/Khp7Y4Sn.png?1645081048"}'
                ) ON CONFLICT (contract) DO UPDATE SET name = EXCLUDED.name;
INSERT INTO currencies (
                  contract,
                  name,
                  symbol,
                  decimals,
                  metadata
                ) VALUES (
                  '\x00f932f0fe257456b32deda4758922e56a4f4b42',
                  'PAPER',
                  'PAPER',
                  18,
                  '{"coingeckoCurrencyId": null, "dexScreenerId": "0x00f932f0fe257456b32deda4758922e56a4f4b42", "image": "https://nftearth.exchange/icons/currency/0x00f932f0fe257456b32deda4758922e56a4f4b42.png"}'
                ) ON CONFLICT (contract) DO UPDATE SET name = EXCLUDED.name, symbol = EXCLUDED.symbol, decimals = EXCLUDED.decimals, metadata = EXCLUDED.metadata;
-- Down Migration
DELETE FROM currencies WHERE contract = '\xd52f94df742a6f4b4c8b033369fe13a41782bf44';
DELETE FROM currencies WHERE contract = '\x00f932f0fe257456b32deda4758922e56a4f4b42';
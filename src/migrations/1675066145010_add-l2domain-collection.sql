-- Up Migration
INSERT INTO "collections"("id","slug","name","metadata","royalties","community","index_metadata","contract","token_id_range","token_set_id","token_count","minted_timestamp","royalties_bps","verified") VALUES('0x9A7657d1593032C75d70950707870c3cC7ca45DC','l2','.l2','{"imageUrl":null,"discordUrl":null,"description":null,"externalUrl":null,"bannerImageUrl":null,"twitterUsername":null}','[]',null,null,'\x9a7657d1593032c75d70950707870c3cc7ca45dc','(0,1318)','contract:0x9A7657d1593032C75d70950707870c3cC7ca45DC',1319,0,0,'t') ON CONFLICT DO NOTHING;
-- Down Migration
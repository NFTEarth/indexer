-- Up Migration
UPDATE "collections" SET "token_id_range"='(,)' WHERE id = '0x9b9f542456ad12796ccb8eb6644f29e3314e68e1';
UPDATE "collections" SET "token_id_range"='(,)' WHERE id = '0x66deb6cc4d65dc9cb02875dc5e8751d71fa5d50e';
UPDATE "collections" SET "token_id_range"='(,)' WHERE id = '0x9a7657d1593032c75d70950707870c3cc7ca45dc';
UPDATE "collections" SET "token_id_range"='(,)' WHERE id = '0x8e56343adafa62dac9c9a8ac8c742851b0fb8b03';
UPDATE "collections" SET "token_id_range"='(,)' WHERE id = '0x5c9d55b78febcc2061715ba4f57ecf8ea2711f2c';
UPDATE "collections" SET "token_id_range"='(,)' WHERE id = '0x0deaac29d8a3d4ebbaaa3ecd3cc97c9def00f720';
-- Down Migration
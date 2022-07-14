import { idb, redb } from "@/common/db";
import { fromBuffer, toBuffer } from "@/common/utils";

export type Block = {
  hash: string;
  number: number;
  timestamp: number;
};

export const saveBlock = async (block: Block): Promise<Block> => {
  await idb.none(
    `
      INSERT INTO blocks (
        hash,
        number,
        "timestamp"
      ) VALUES (
        $/hash/,
        $/number/,
        $/timestamp/
      )
      ON CONFLICT DO NOTHING
    `,
    {
      hash: toBuffer(block.hash),
      number: block.number,
      timestamp: block.timestamp,
    }
  );

  return block;
};

export const deleteBlock = async (number: number, hash: string) =>
  idb.none(
    `
      DELETE FROM blocks
      WHERE blocks.hash = $/hash/
        AND blocks.number = $/number/
    `,
    {
      hash: toBuffer(hash),
      number,
    }
  );

export const getBlocks = async (number: number): Promise<Block[]> =>
  redb
    .manyOrNone(
      `
        SELECT
          blocks.hash,
          blocks.timestamp
        FROM blocks
        WHERE blocks.number = $/number/
      `,
      { number }
    )
    .then((result) =>
      result.map(({ hash, timestamp }) => ({
        hash: fromBuffer(hash),
        number,
        timestamp,
      }))
    );

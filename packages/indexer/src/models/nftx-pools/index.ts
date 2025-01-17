import { idb, redb } from "@/common/db";
import { fromBuffer, toBuffer } from "@/common/utils";

export type NftxNftPool = {
  address: string;
  nft: string;
  vaultId: number;
};

export const saveNftxNftPool = async (nftxNftPool: NftxNftPool) => {
  await idb.none(
    `
      INSERT INTO nftx_nft_pools (
        address,
        nft,
        vault_id
      ) VALUES (
        $/address/,
        $/nft/,
        $/vaultId/
      )
      ON CONFLICT DO NOTHING
    `,
    {
      address: toBuffer(nftxNftPool.address),
      nft: toBuffer(nftxNftPool.nft),
      vaultId: nftxNftPool.vaultId,
    }
  );

  return nftxNftPool;
};

export const getNftxNftPool = async (address: string): Promise<NftxNftPool> => {
  const result = await redb.oneOrNone(
    `
      SELECT
        nftx_nft_pools.address,
        nftx_nft_pools.nft,
        nftx_nft_pools.vault_id
      FROM nftx_nft_pools
      WHERE nftx_nft_pools.address = $/address/
    `,
    { address: toBuffer(address) }
  );

  return {
    address,
    nft: fromBuffer(result.nft),
    vaultId: result.vault_id,
  };
};

export type NftxFtPool = {
  address: string;
  token0: string;
  token1: string;
};

export const saveNftxFtPool = async (nftxFtPool: NftxFtPool) => {
  await idb.none(
    `
      INSERT INTO nftx_ft_pools (
        address,
        token0,
        token1
      ) VALUES (
        $/address/,
        $/token0/,
        $/token1/
      )
      ON CONFLICT DO NOTHING
    `,
    {
      address: toBuffer(nftxFtPool.address),
      token0: toBuffer(nftxFtPool.token0),
      token1: toBuffer(nftxFtPool.token1),
    }
  );

  return nftxFtPool;
};

export const getNftxFtPool = async (address: string): Promise<NftxFtPool> => {
  const result = await redb.oneOrNone(
    `
      SELECT
        nftx_ft_pools.address,
        nftx_ft_pools.token0,
        nftx_ft_pools.token1
      FROM nftx_ft_pools
      WHERE nftx_ft_pools.address = $/address/
    `,
    { address: toBuffer(address) }
  );

  return {
    address,
    token0: fromBuffer(result.token0),
    token1: fromBuffer(result.token1),
  };
};

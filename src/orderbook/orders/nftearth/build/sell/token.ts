import * as Sdk from "@nftearth/sdk";
import { BaseBuilder } from "@nftearth/sdk/dist/nftearth/builders/base";

import { redb } from "@/common/db";
import { toBuffer } from "@/common/utils";
import { config } from "@/config/index";
import * as utils from "@/orderbook/orders/nftearth/build/utils";

interface BuildOrderOptions extends utils.BaseOrderBuildOptions {
  tokenId: string;
}

export const build = async (options: BuildOrderOptions) => {
  const collectionResult = await redb.oneOrNone(
    `
      SELECT
        tokens.collection_id
      FROM tokens
      WHERE tokens.contract = $/contract/
        AND tokens.token_id = $/tokenId/
    `,
    {
      contract: toBuffer(options.contract),
      tokenId: options.tokenId,
    }
  );
  if (!collectionResult) {
    throw new Error("Could not retrieve token's collection");
  }

  const buildInfo = await utils.getBuildInfo(options, collectionResult.collection_id, "sell");

  const builder: BaseBuilder = new Sdk.NFTEarth.Builders.SingleToken(config.chainId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (buildInfo.params as any).tokenId = options.tokenId;

  return builder?.build(buildInfo.params);
};

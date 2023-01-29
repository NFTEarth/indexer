import * as Sdk from "@nftearth/sdk";
import { BaseBuilder } from "@nftearth/sdk/dist/universe/builders/base";

import { redb } from "@/common/db";
import { logger } from "@/common/logger";
import { toBuffer } from "@/common/utils";
import { config } from "@/config/index";
import * as utils from "@/orderbook/orders/universe/build/utils";

export const build = async (options: utils.BaseOrderBuildOptions) => {
  try {
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
      // Skip if we cannot retrieve the token's collection.
      return undefined;
    }

    const buildInfo = await utils.getBuildInfo(
      options,
      collectionResult.collection_id,
      Sdk.Universe.Types.OrderSide.BUY
    );

    if (!buildInfo) {
      // Skip if we cannot generate the build information.
      return undefined;
    }

    const builder: BaseBuilder = new Sdk.Universe.Builders.SingleToken(config.chainId);

    return builder?.build(buildInfo.params);
  } catch (error) {
    logger.error("universe-build-buy-token-order", `Failed to build order: ${error}`);
    return undefined;
  }
};

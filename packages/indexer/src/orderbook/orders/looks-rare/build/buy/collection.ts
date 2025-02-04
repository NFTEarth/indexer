import * as Sdk from "@nftearth/sdk";
import { BaseBuilder } from "@nftearth/sdk/dist/looks-rare/builders/base";

import { redb } from "@/common/db";
import { config } from "@/config/index";
import * as utils from "@/orderbook/orders/looks-rare/build/utils";

interface BuildOrderOptions extends utils.BaseOrderBuildOptions {
  collection: string;
}

export const build = async (options: BuildOrderOptions) => {
  const collectionResult = await redb.oneOrNone(
    `
      SELECT
        collections.id
      FROM collections
      WHERE collections.id = $/collection/
    `,
    {
      collection: options.collection,
    }
  );
  if (!collectionResult?.id || collectionResult.id.includes(":")) {
    // Skip if the collection is not available or not supported (eg. range or list collection)
    throw new Error("Could not fetch collection");
  }

  const buildInfo = await utils.getBuildInfo(options, options.collection, "buy");
  if (!buildInfo) {
    throw new Error("Could not generate build info");
  }

  const builder: BaseBuilder = new Sdk.LooksRare.Builders.ContractWide(config.chainId);
  return builder.build(buildInfo.params);
};

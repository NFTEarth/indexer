import * as Sdk from "@nftearth/sdk";
import { BaseBuilder } from "@nftearth/sdk/dist/zeroex-v4/builders/base";
import { getBitVectorCalldataSize } from "@nftearth/sdk/dist/common/helpers/bit-vector";
import { getPackedListCalldataSize } from "@nftearth/sdk/dist/common/helpers/packed-list";

import { redb } from "@/common/db";
import { bn, fromBuffer } from "@/common/utils";
import { config } from "@/config/index";
import * as utils from "@/orderbook/orders/zeroex-v4/build/utils";

interface BuildOrderOptions extends utils.BaseOrderBuildOptions {
  // TODO: refactor
  // The following combinations are possible:
  // - collection + attributes
  // - tokenSetId
  tokenSetId?: string;
  collection?: string;
  attributes?: { key: string; value: string }[];
}

export const build = async (options: BuildOrderOptions) => {
  let buildInfo: utils.OrderBuildInfo | undefined;
  let tokenIds: string[];

  if (options.collection && options.attributes) {
    if (options.attributes.length !== 1) {
      // TODO: Support more than one attribute
      throw new Error("Attribute bids must be on a single attribute");
    }

    const attributeResult = await redb.oneOrNone(
      `
        SELECT
          "c"."contract",
          "a"."token_count"
        FROM "attributes" "a"
        JOIN "attribute_keys" "ak"
          ON "a"."attribute_key_id" = "ak"."id"
        JOIN "collections" "c"
          ON "ak"."collection_id" = "c"."id"
        WHERE "ak"."collection_id" = $/collection/
          AND "ak"."key" = $/key/
          AND "a"."value" = $/value/
      `,
      {
        collection: options.collection,
        key: options.attributes[0].key,
        value: options.attributes[0].value,
      }
    );

    if (!attributeResult.token_count) {
      // Skip if we cannot retrieve the collection
      throw new Error("Could not retrieve attribute info");
    }

    if (Number(attributeResult.token_count) > config.maxTokenSetSize) {
      // We don't support attribute orders on large token sets
      throw new Error("Attribute has too many items");
    }

    buildInfo = await utils.getBuildInfo(
      {
        ...options,
        contract: fromBuffer(attributeResult.contract),
      },
      options.collection,
      "buy"
    );

    const excludeFlaggedTokens = options.excludeFlaggedTokens ? `AND "t"."is_flagged" = 0` : "";

    // Fetch all tokens matching the attributes
    const tokens = await redb.manyOrNone(
      `
        SELECT "ta"."token_id"
        FROM "token_attributes" "ta"
        JOIN "attributes" "a" ON "ta"."attribute_id" = "a"."id"
        JOIN "attribute_keys" "ak" ON "a"."attribute_key_id" = "ak"."id"
        JOIN "tokens" "t" ON "ta"."contract" = "t"."contract" AND "ta"."token_id" = "t"."token_id"
        WHERE "ak"."collection_id" = $/collection/
        AND "ak"."key" = $/key/
        AND "a"."value" = $/value/
        ${excludeFlaggedTokens}
        ORDER BY "ta"."token_id"
      `,
      {
        collection: options.collection,
        key: options.attributes[0].key,
        value: options.attributes[0].value,
      }
    );

    tokenIds = tokens.map(({ token_id }) => token_id);
  } else {
    // Fetch all tokens matching the token set
    const tokens = await redb.manyOrNone(
      `
        SELECT
          token_sets_tokens.contract,
          token_sets_tokens.token_id
        FROM token_sets_tokens
        WHERE token_sets_tokens.token_set_id = $/tokenSetId/
      `,
      {
        tokenSetId: options.tokenSetId!,
      }
    );

    buildInfo = await utils.getBuildInfo(
      {
        ...options,
        contract: fromBuffer(tokens[0].contract),
      },
      fromBuffer(tokens[0].contract),
      "buy"
    );

    tokenIds = tokens.map(({ token_id }) => token_id);
  }

  if (!buildInfo) {
    // Skip if we cannot generate the build information
    throw new Error("Could not generate build info");
  }

  // Choose the most gas-efficient method for checking (bit vector vs packed list)
  let bitVectorCost = -1;
  if (bn(tokenIds[tokenIds.length - 1]).lte(200000)) {
    bitVectorCost = getBitVectorCalldataSize(tokenIds.map(Number));
  }
  const packedListCost = getPackedListCalldataSize(tokenIds);

  // If the calldata exceeds ~50.000 bytes we simply revert
  const costThreshold = 100000;

  let builder: BaseBuilder | undefined;
  if (bitVectorCost == -1 || bitVectorCost > packedListCost) {
    if (packedListCost > costThreshold) {
      throw new Error("Cost too high");
    }

    if (buildInfo.kind === "erc721") {
      builder = new Sdk.ZeroExV4.Builders.TokenList.PackedList(config.chainId);
    } else if (buildInfo.kind === "erc1155") {
      builder = new Sdk.ZeroExV4.Builders.TokenList.PackedList(config.chainId);
    } else {
      throw new Error("Could not build order");
    }
  } else {
    if (bitVectorCost > costThreshold) {
      throw new Error("Cost too high");
    }

    if (buildInfo.kind === "erc721") {
      builder = new Sdk.ZeroExV4.Builders.TokenList.BitVector(config.chainId);
    } else if (buildInfo.kind === "erc1155") {
      builder = new Sdk.ZeroExV4.Builders.TokenList.BitVector(config.chainId);
    } else {
      throw new Error("Could not build order");
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (buildInfo.params as any).tokenIds = tokenIds;

  return builder.build(buildInfo.params);
};

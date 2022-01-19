import * as Sdk from "@reservoir0x/sdk";
import {
  BaseBuilder,
  BaseBuildParams,
} from "@reservoir0x/sdk/dist/wyvern-v2/builders/base";

import { db } from "@/common/db";
import { config } from "@/config/index";

export type BuildOrderOptions = {
  contract?: string;
  tokenId?: string;
  collection?: string;
  attributeKey?: string;
  attributeValue?: string;
  maker: string;
  side: "buy" | "sell";
  price: string;
  fee: number;
  feeRecipient: string;
  listingTime?: number;
  expirationTime?: number;
  salt?: string;
};

export const buildOrder = async (options: BuildOrderOptions) => {
  try {
    const buildParams: BaseBuildParams = {
      maker: options.maker,
      side: options.side,
      price: options.price,
      paymentToken:
        options.side === "buy"
          ? Sdk.Common.Addresses.Weth[config.chainId]
          : Sdk.Common.Addresses.Eth[config.chainId],
      fee: options.fee,
      feeRecipient: options.feeRecipient,
      listingTime: options.listingTime,
      expirationTime: options.expirationTime,
      salt: options.salt,
    };

    let builder: BaseBuilder | undefined;
    if (options.contract && options.tokenId) {
      const { contract, tokenId } = options;

      const data = await db.oneOrNone(
        `
          select "c"."kind" from "tokens" "t"
          join "contracts" "c"
            on "t"."contract" = "c"."address"
          where "t"."contract" = $/contract/
            and "t"."token_id" = $/tokenId/
        `,
        { contract, tokenId }
      );

      (buildParams as any).contract = contract;
      (buildParams as any).tokenId = tokenId;

      if (data.kind === "erc721") {
        builder = new Sdk.WyvernV2.Builders.Erc721.SingleToken(config.chainId);
      } else if (data.kind === "erc1155") {
        builder = new Sdk.WyvernV2.Builders.Erc1155.SingleToken(config.chainId);
      }
    } else if (
      options.collection &&
      options.attributeKey &&
      options.attributeValue
    ) {
      const { collection, attributeKey, attributeValue } = options;

      const data = await db.manyOrNone(
        `
          select
            "c"."kind",
            "t"."contract",
            "t"."token_id"
          from "tokens" "t"
          join "attributes" "a"
            on "t"."contract" = "a"."contract"
            and "t"."token_id" = "a"."token_id"
          join "contracts" "c"
            on "t"."contract" = "c"."address"
          where "t"."collection_id" = $/collection/
            and "a"."key" = $/attributeKey/
            and "a"."value" = $/attributeValue/
        `,
        { collection, attributeKey, attributeValue }
      );

      if (
        data.length &&
        data.every(
          ({ kind, contract }) =>
            kind === data[0].kind && contract === data[0].contract
        )
      ) {
        const contract = data[0].contract;
        const kind = data[0].kind;

        (buildParams as any).contract = contract;
        (buildParams as any).tokenIds = data.map(({ token_id }) => token_id);

        if (kind === "erc721") {
          builder = new Sdk.WyvernV2.Builders.Erc721.TokenList(config.chainId);
        }
      }
    } else if (
      options.collection &&
      !options.attributeKey &&
      !options.attributeValue
    ) {
      const { collection } = options;

      const data = await db.oneOrNone(
        `
          select
            "co"."kind",
            "cl"."token_set_id"
          from "collections" "cl"
          join "contracts" "co"
            on "cl"."contract" = "co"."address"
          where "cl"."id" = $/collection/
        `,
        { collection }
      );

      if (data?.token_set_id?.startsWith("contract")) {
        // Collection is a full contract

        (buildParams as any).contract = data.token_set_id.split(":")[1];

        if (data.kind === "erc721") {
          builder = new Sdk.WyvernV2.Builders.Erc721.ContractWide(
            config.chainId
          );
        } else if (data.kind === "erc1155") {
          builder = new Sdk.WyvernV2.Builders.Erc1155.ContractWide(
            config.chainId
          );
        }
      } else if (data?.token_set_id?.startsWith("range")) {
        // Collection is a range of tokens within a contract

        const [contract, startTokenId, endTokenId] = data.token_set_id
          .split(":")
          .slice(1);
        (buildParams as any).contract = contract;
        (buildParams as any).startTokenId = startTokenId;
        (buildParams as any).endTokenId = endTokenId;
      }

      if (data.kind === "erc721") {
        builder = new Sdk.WyvernV2.Builders.Erc721.TokenRange(config.chainId);
      } else if (data.kind === "erc1155") {
        builder = new Sdk.WyvernV2.Builders.Erc1155.TokenRange(config.chainId);
      }
    }

    return builder?.build(buildParams);
  } catch {
    return undefined;
  }
};

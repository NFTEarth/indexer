/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";

import { edb } from "@/common/db";
import { logger } from "@/common/logger";
import { formatEth, toBuffer } from "@/common/utils";

const version = "v1";

export const getUserCollectionsV1Options: RouteOptions = {
  description: "User collections",
  notes:
    "Get aggregate stats for a user, grouped by collection. Useful for showing total portfolio information.",
  tags: ["api", "users"],
  validate: {
    params: Joi.object({
      user: Joi.string()
        .lowercase()
        .pattern(/^0x[a-f0-9]{40}$/)
        .required(),
    }),
    query: Joi.object({
      community: Joi.string().lowercase(),
      collection: Joi.string().lowercase(),
      offset: Joi.number().integer().min(0).max(10000).default(0),
      limit: Joi.number().integer().min(1).max(100).default(20),
    }),
  },
  response: {
    schema: Joi.object({
      collections: Joi.array().items(
        Joi.object({
          collection: Joi.object({
            id: Joi.string(),
            name: Joi.string().allow(null, ""),
            metadata: Joi.any().allow(null),
            floorAskPrice: Joi.number().unsafe().allow(null),
            topBidValue: Joi.number().unsafe().allow(null),
          }),
          ownership: Joi.object({
            tokenCount: Joi.string(),
            onSaleCount: Joi.string(),
            liquidCount: Joi.string(),
          }),
        })
      ),
    }).label(`getUserCollections${version.toUpperCase()}Response`),
    failAction: (_request, _h, error) => {
      logger.error(
        `get-user-collections-${version}-handler`,
        `Wrong response schema: ${error}`
      );
      throw error;
    },
  },
  handler: async (request: Request) => {
    const params = request.params as any;
    const query = request.query as any;

    try {
      let baseQuery = `
        SELECT  collections.id,
                collections.name,
                collections.metadata,
                SUM(nft_balances.amount) AS token_count,
                MAX(tokens.top_buy_value) AS top_buy_value,
                MIN(tokens.floor_sell_value) AS floor_sell_value,
                SUM(CASE WHEN tokens.floor_sell_value IS NULL THEN 0 ELSE 1 END) AS on_sale_count,
                SUM(CASE WHEN tokens.top_buy_value IS NULL THEN 0 ELSE 1 END) AS liquid_count
        FROM nft_balances
        JOIN tokens ON nft_balances.contract = tokens.contract AND nft_balances.token_id = tokens.token_id
        JOIN collections ON nft_balances.contract = collections.contract
      `;

      // Filters
      (params as any).user = toBuffer(params.user);
      const conditions: string[] = [
        `nft_balances.owner = $/user/`,
        `nft_balances.amount > 0`,
      ];

      if (query.community) {
        conditions.push(`collections.community = $/community/`);
      }
      if (query.collection) {
        conditions.push(`collections.id = $/collection/`);
      }
      if (conditions.length) {
        baseQuery += " WHERE " + conditions.map((c) => `(${c})`).join(" AND ");
      }

      // Grouping
      baseQuery += ` GROUP BY collections.id, nft_balances.owner`;

      // Sorting
      baseQuery += ` ORDER BY collections.id ASC`;

      // Pagination
      baseQuery += ` OFFSET $/offset/`;
      baseQuery += ` LIMIT $/limit/`;

      const result = await edb
        .manyOrNone(baseQuery, { ...params, ...query })
        .then((result) =>
          result.map((r) => ({
            collection: {
              id: r.id,
              name: r.name,
              metadata: r.metadata,
              floorAskPrice: r.floor_sell_value ? formatEth(r.floor_sell_value) : null,
              topBidValue: r.top_buy_value ? formatEth(r.top_buy_value) : null,
            },
            ownership: {
              tokenCount: String(r.token_count),
              onSaleCount: String(r.on_sale_count),
              liquidCount: String(r.liquid_count),
            },
          }))
        );

      return { collections: result };
    } catch (error) {
      logger.error(
        `get-user-collections-${version}-handler`,
        `Handler failure: ${error}`
      );
      throw error;
    }
  },
};

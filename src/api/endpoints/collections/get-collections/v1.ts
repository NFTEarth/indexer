import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";

import { db } from "@/common/db";
import { logger } from "@/common/logger";
import { formatEth, fromBuffer, toBuffer } from "@/common/utils";

const version = "v1";

export const getCollectionsV1Options: RouteOptions = {
  description:
    "Get a list of collections. Useful for getting all collections in a marketplace.",
  tags: ["api", "collections"],
  validate: {
    query: Joi.object({
      community: Joi.string().lowercase(),
      contract: Joi.string()
        .lowercase()
        .pattern(/^0x[a-f0-9]{40}$/),
      name: Joi.string().lowercase(),
      sortBy: Joi.string().valid("id").default("id"),
      sortDirection: Joi.string().lowercase().valid("asc", "desc"),
      offset: Joi.number().integer().min(0).max(10000).default(0),
      limit: Joi.number().integer().min(1).max(20).default(20),
    })
      .or("community", "contract", "name")
      .oxor("community", "contract", "name"),
  },
  response: {
    schema: Joi.object({
      collections: Joi.array().items(
        Joi.object({
          id: Joi.string(),
          slug: Joi.string(),
          name: Joi.string().allow(null, ""),
          metadata: Joi.any().allow(null),
          tokenCount: Joi.number(),
          tokenSetId: Joi.string().allow(null),
          royalties: Joi.object({
            recipient: Joi.string().allow(null, ""),
            bps: Joi.number(),
          }),
          floorAskPrice: Joi.number().unsafe().allow(null),
          topBidValue: Joi.number().unsafe().allow(null),
          topBidMaker: Joi.string()
            .lowercase()
            .pattern(/^0x[a-f0-9]{40}$/)
            .allow(null),
          day1Rank: Joi.number(),
          day7Rank: Joi.number(),
          day30Rank: Joi.number(),
          allTimeRank: Joi.number(),
          day1Volume: Joi.number().unsafe().allow(null),
          day7Volume: Joi.number().unsafe().allow(null),
          day30Volume: Joi.number().unsafe().allow(null),
          allTimeVolume: Joi.number().unsafe().allow(null),
        })
      ),
    }).label(`getCollections${version.toUpperCase()}Response`),
    failAction: (_request, _h, error) => {
      logger.error(
        `get-collections-${version}-handler`,
        `Wrong response schema: ${error}`
      );

      throw error;
    },
  },
  handler: async (request: Request) => {
    const query = request.query as any;

    try {
      let baseQuery = `
        SELECT
          "c"."id",
          "c"."slug",
          "c"."name",
          "c"."metadata",
          "c"."royalties",
          "c"."token_set_id",
          "c"."token_count",
          (
            SELECT MIN("t"."floor_sell_value") FROM "tokens" "t"
            WHERE "t"."collection_id" = "c"."id"
          ) AS "floor_sell_value",
          "c"."day1_rank",
          "c"."day1_volume",
          "c"."day7_rank",
          "c"."day7_volume",
          "c"."day30_rank",
          "c"."day30_volume",
          "c"."all_time_rank",
          "c"."all_time_volume"
        FROM "collections" "c"
        JOIN "tokens" "t"
          ON "c"."id" = "t"."collection_id"
      `;

      // Filters
      const conditions: string[] = [];
      if (query.community) {
        conditions.push(`"c"."community" = $/community/`);
      }
      if (query.contract) {
        query.contract = toBuffer(query.contract);
        conditions.push(`"c"."contract" = $/contract/`);
      }
      if (query.name) {
        query.name = `%${query.name}%`;
        conditions.push(`"c"."name" ilike $/name/`);
      }
      if (conditions.length) {
        baseQuery += " WHERE " + conditions.map((c) => `(${c})`).join(" AND ");
      }

      // Grouping
      baseQuery += ` GROUP BY "c"."id"`;

      // Sorting
      switch (query.sortBy) {
        case "id":
        default: {
          baseQuery += ` ORDER BY "c"."id" ${query.sortDirection || "ASC"}`;
          break;
        }
      }

      // Pagination
      baseQuery += ` OFFSET $/offset/`;
      baseQuery += ` LIMIT $/limit/`;

      baseQuery = `
        WITH "x" AS (${baseQuery})
        SELECT
          "x".*,
          "y".*
        FROM "x"
        LEFT JOIN LATERAL (
          SELECT
            "ts"."top_buy_value",
            "ts"."top_buy_maker"
          FROM "token_sets" "ts"
          WHERE "ts"."id" = "x"."token_set_id"
          ORDER BY "ts"."top_buy_value" DESC
          LIMIT 1
        ) "y" ON TRUE
      `;

      const result = await db.manyOrNone(baseQuery, query).then((result) =>
        result.map((r) => ({
          id: r.id,
          slug: r.slug,
          name: r.name,
          metadata: r.metadata,
          tokenCount: Number(r.token_count),
          tokenSetId: r.token_set_id,
          royalties: r.royalties ? r.royalties[0] : null,
          floorAskPrice: r.floor_sell_value
            ? formatEth(r.floor_sell_value)
            : null,
          topBidValue: r.top_buy_value ? formatEth(r.top_buy_value) : null,
          topBidMaker: r.top_buy_maker ? fromBuffer(r.top_buy_maker) : null,
          day1Rank: r.day1_rank,
          day7Rank: r.day7_rank,
          day30Rank: r.day30_rank,
          allTimeRank: r.all_time_rank,
          day1Volume: Number(r.day1_volume),
          day7Volume: Number(r.day7_volume),
          day30Volume: Number(r.day30_volume),
          allTimeVolume: Number(r.all_time_volume),
        }))
      );

      return { collections: result };
    } catch (error) {
      logger.error(
        `get-collections-${version}-handler`,
        `Handler failure: ${error}`
      );
      throw error;
    }
  },
};

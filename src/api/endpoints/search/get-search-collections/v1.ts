/* eslint-disable @typescript-eslint/no-explicit-any */

import _ from "lodash";
import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";

import { logger } from "@/common/logger";
import { edb } from "@/common/db";
import { fromBuffer } from "@/common/utils";

const version = "v1";

export const getSearchCollectionsV1Options: RouteOptions = {
  cache: {
    privacy: "public",
    expiresIn: 10000,
  },
  description: "Search for collections by given name",
  tags: ["api", "6. Search"],
  plugins: {
    "hapi-swagger": {
      order: 53,
    },
  },
  validate: {
    query: Joi.object({
      name: Joi.string()
        .lowercase()
        .description("Lightweight search for collections that match a string, e.g. `bored`"),
      limit: Joi.number().integer().min(1).max(50).default(20),
    }),
  },
  response: {
    schema: Joi.object({
      collections: Joi.array().items(
        Joi.object({
          collectionId: Joi.string(),
          contract: Joi.string(),
          image: Joi.string().allow(null, ""),
          name: Joi.string(),
        })
      ),
    }).label(`getSearchCollections${version.toUpperCase()}Response`),
    failAction: (_request, _h, error) => {
      logger.error(`get-search-collections-${version}-handler`, `Wrong response schema: ${error}`);
      throw error;
    },
  },
  handler: async (request: Request) => {
    const query = request.query as any;
    let nameFilter = "";
    if (query.name) {
      query.name = `%${query.name}%`;
      nameFilter = "WHERE name ILIKE $/name/";
    }

    const baseQuery = `
            SELECT id, name, contract, (metadata ->> 'imageUrl')::TEXT AS image
            FROM collections
            ${nameFilter}
            ORDER BY all_time_volume DESC
            OFFSET 0
            LIMIT $/limit/`;

    const collections = await edb.manyOrNone(baseQuery, query);

    return {
      collections: _.map(collections, (collection) => ({
        collectionId: collection.id,
        name: collection.name,
        contract: fromBuffer(collection.contract),
        image: collection.image,
      })),
    };
  },
};

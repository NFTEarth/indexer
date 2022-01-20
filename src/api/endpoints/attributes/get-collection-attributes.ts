import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";

import { logger } from "@/common/logger";
import * as queries from "@/entities/attributes/get-collection-attributes";

export const getCollectionAttributesOptions: RouteOptions = {
  description:
    "Explore the top attribute values, across a whole collection or within a single attribute key",
  tags: ["api"],
  validate: {
    params: Joi.object({
      collection: Joi.string().lowercase().required(),
    }),
    query: Joi.object({
      attribute: Joi.string(),
      sortBy: Joi.string()
        .valid("value", "floorSellValue", "floorCap", "topBuyValue")
        .default("value"),
      sortDirection: Joi.string()
        .lowercase()
        .valid("asc", "desc")
        .default("asc"),
      offset: Joi.number().integer().min(0).default(0),
      limit: Joi.number().integer().min(1).default(20),
    }),
  },
  response: {
    schema: Joi.object({
      attributes: Joi.array().items(
        Joi.object({
          key: Joi.string(),
          value: Joi.string(),
          tokenCount: Joi.number(),
          onSaleCount: Joi.number(),
          sampleImages: Joi.array().items(Joi.string().allow("")),
          lastSells: Joi.array().items(
            Joi.object({
              value: Joi.number().unsafe(),
              block: Joi.number(),
            })
          ),
          floorSellValues: Joi.array().items(Joi.number().unsafe()),
          topBuy: Joi.object({
            hash: Joi.string().allow(null),
            value: Joi.number().unsafe().allow(null),
            maker: Joi.string().allow(null),
            validFrom: Joi.number().allow(null),
          }),
        })
      ),
    }).label("getCollectionAttributesResponse"),
    failAction: (_request, _h, error) => {
      logger.error(
        "get_collection_attributes_handler",
        `Wrong response schema: ${error}`
      );
      throw error;
    },
  },
  handler: async (request: Request) => {
    const params = request.params as any;
    const query = request.query as any;

    try {
      const attributes = await queries.getCollectionAttributes({
        ...params,
        ...query,
      } as queries.GetCollectionAttributesFilter);

      return { attributes };
    } catch (error) {
      logger.error(
        "get_collection_attributes_handler",
        `Handler failure: ${error}`
      );
      throw error;
    }
  },
};

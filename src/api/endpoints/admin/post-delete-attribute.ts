/* eslint-disable @typescript-eslint/no-explicit-any */

import * as Boom from "@hapi/boom";
import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";

import { logger } from "@/common/logger";
import { config } from "@/config/index";
import { JoiAttributeValue } from "@/common/joi";
import { Tokens } from "@/models/tokens";
import { AttributeKeys } from "@/models/attribute-keys";
import { Attributes } from "@/models/attributes";

export const postDeleteAttributes: RouteOptions = {
  description: "Delete attribute from collection",
  tags: ["api", "x-admin"],
  validate: {
    headers: Joi.object({
      "x-admin-api-key": Joi.string().required(),
    }).options({ allowUnknown: true }),
    payload: Joi.object({
      collection: Joi.string()
        .lowercase()
        .description(
          "Delete the given collection attribute. Example: `0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63`"
        )
        .required(),
      key: Joi.string().required(),
      values: Joi.array().items(
        Joi.object({
          value: JoiAttributeValue,
          count: Joi.number(),
        })
      ),
    }),
  },
  handler: async (request: Request) => {
    if (request.headers["x-admin-api-key"] !== config.adminApiKey) {
      throw Boom.unauthorized("Wrong or missing admin API key");
    }

    const payload = request.payload as any;

    try {
      const { collection, key, values } = payload;

      if (values) {
        if (Array.isArray(values)) {
          for (const value of values) {
            const attribute = await Attributes.getAttributeByCollectionKeyValue(
              collection,
              key,
              value
            );

            if (attribute) {
              await Attributes.delete(attribute?.id);
            }
          }
        } else {
          const attribute = await Attributes.getAttributeByCollectionKeyValue(
            collection,
            key,
            values
          );

          if (attribute) {
            await Attributes.delete(attribute?.id);
          }
        }

        return {
          message: `Attribute value ${values.join(", ")} for collection ${collection} was deleted`,
        };
      }

      if (key) {
        const attributeKeyCount = await Tokens.getTokenAttributesKeyCount(collection, key);

        await AttributeKeys.delete(collection, key);
        await AttributeKeys.update(collection, key, {
          attributeCount: attributeKeyCount.count - 1,
        });

        return {
          message: `Attribute key ${key} for collection ${collection} was deleted`,
        };
      }

      throw "Unknown request";
    } catch (error) {
      logger.error("post-delete-rate-limit-handler", `Handler failure: ${error}`);
      throw error;
    }
  },
};

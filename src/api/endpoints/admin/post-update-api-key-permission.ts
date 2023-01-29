/* eslint-disable @typescript-eslint/no-explicit-any */

import * as Boom from "@hapi/boom";
import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";

import { logger } from "@/common/logger";
import { config } from "@/config/index";
import { ApiKeyManager } from "@/models/api-keys";
import { ApiKeyPermission } from "@/models/api-keys/api-key-entity";

export const postUpdateApiKeyPermissions: RouteOptions = {
  description: "Update the given api key permissions",
  tags: ["api", "x-admin"],
  validate: {
    headers: Joi.object({
      "x-admin-api-key": Joi.string().required(),
    }).options({ allowUnknown: true }),
    payload: Joi.object({
      apiKey: Joi.string().description("The api key to update"),
      overrideCollectionRefreshCooldown: Joi.boolean().required().default(false),
      assignCollectionToCommunity: Joi.boolean().required().default(false),
    }),
  },
  handler: async (request: Request) => {
    if (request.headers["x-admin-api-key"] !== config.adminApiKey) {
      throw Boom.unauthorized("Wrong or missing admin API key");
    }

    const payload = request.payload as any;

    const permissions: Record<ApiKeyPermission, unknown> = {
      override_collection_refresh_cool_down: payload.overrideCollectionRefreshCooldown,
      assign_collection_to_community: payload.assignCollectionToCommunity,
    };

    try {
      await ApiKeyManager.update(payload.apiKey, {
        permissions,
      });

      return {
        message: `Api Key ${payload.apiKey} was updated with ${JSON.stringify(payload)}`,
      };
    } catch (error) {
      logger.error("post-update-api-key-permissions-handler", `Handler failure: ${error}`);
      throw error;
    }
  },
};

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as Boom from "@hapi/boom";
import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";

import { logger } from "@/common/logger";
import { config } from "@/config/index";
import { updateRoyaltySpec } from "@/utils/royalties";
import * as royalties from "@/utils/royalties";

export const postCollectionRoyalties: RouteOptions = {
  description: "Update collection royalties",
  tags: ["api", "x-admin"],
  validate: {
    headers: Joi.object({
      "x-admin-api-key": Joi.string().required(),
    }).options({ allowUnknown: true }),
    payload: Joi.object({
      id: Joi.string()
        .lowercase()
        .pattern(/^0x[a-fA-F0-9]{40}$/)
        .required(),
      royalties: Joi.array().items({
        recipient: Joi.string()
          .lowercase()
          .pattern(/^0x[a-fA-F0-9]{40}$/)
          .required(),
        bps: Joi.number().required(),
      }),
    }),
  },
  handler: async (request: Request) => {
    if (request.headers["x-admin-api-key"] !== config.adminApiKey) {
      throw Boom.unauthorized("Wrong or missing admin API key");
    }

    const payload = request.payload as any;

    try {
      await updateRoyaltySpec(payload.id, "nftearth", payload.royalties);
      await royalties.refreshDefaultRoyalties(payload.id);

      return { message: "Request accepted" };
    } catch (error) {
      logger.error(`post-collection-royalties-handler`, `Handler failure: ${error}`);
      throw error;
    }
  },
};

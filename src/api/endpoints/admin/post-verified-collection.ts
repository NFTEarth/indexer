/* eslint-disable @typescript-eslint/no-explicit-any */

import * as Boom from "@hapi/boom";
import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";

import { logger } from "@/common/logger";
import { config } from "@/config/index";
import { idb } from "@/common/db";

export const postVerifiedCollection: RouteOptions = {
  description: "Update collection verified status",
  tags: ["api", "x-admin"],
  validate: {
    headers: Joi.object({
      "x-admin-api-key": Joi.string().required(),
    }).options({ allowUnknown: true }),
    payload: Joi.object({
      address: Joi.string()
        .lowercase()
        .pattern(/^0x[a-fA-F0-9]{40}$/)
        .required(),
      verified: Joi.bool().required(),
    }),
  },
  handler: async (request: Request) => {
    if (request.headers["x-admin-api-key"] !== config.adminApiKey) {
      throw Boom.unauthorized("Wrong or missing admin API key");
    }

    const payload = request.payload as any;
    const address = payload.address;
    const verified = payload.verified;

    try {
      await idb.query("UPDATE collections SET verified=$/verified/ WHERE id=$/address/", {
        verified,
        address,
      });

      return { message: "Request accepted" };
    } catch (error) {
      logger.error(`post-flag-address-handler`, `Handler failure: ${error}`);
      throw error;
    }
  },
};

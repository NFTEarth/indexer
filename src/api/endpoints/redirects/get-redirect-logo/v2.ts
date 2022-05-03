/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";

import { logger } from "@/common/logger";
import { Sources } from "@/models/sources";

const version = "v2";

export const getRedirectLogoV2Options: RouteOptions = {
  description: "Redirect response to the given source logo",
  tags: ["api", "5. Redirects"],
  plugins: {
    "hapi-swagger": {
      order: 53,
    },
  },
  validate: {
    params: Joi.object({
      source: Joi.string().required(),
    }),
  },
  handler: async (request: Request, response) => {
    const params = request.params as any;
    const sources = await Sources.getInstance();

    try {
      const source = await sources.getByName(params.source);
      return response.redirect(source.metadata.icon);
    } catch (error) {
      logger.error(`get-redirect-logo-${version}-handler`, `Handler failure: ${error}`);
      throw error;
    }
  },
};

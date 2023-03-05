/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";
import { logger } from "@/common/logger";
import { regex } from "@/common/utils";
import { idb } from "@/common/db";
import { updateRoyaltySpec } from "@/utils/royalties";
import * as royalties from "@/utils/royalties";
import { ApiKeyManager } from "@/models/api-keys";
import _ from "lodash";
import * as Boom from "@hapi/boom";

const version = "v1";

export const postUpdateLaunchpadV1Options: RouteOptions = {
  description: "Update Launchpad Contract",
  tags: ["api", "Launchpad"],
  plugins: {
    "hapi-swagger": {
      order: 1,
    },
  },
  validate: {
    headers: Joi.object({
      "x-api-key": Joi.string(),
    }).options({ allowUnknown: true }),
    payload: Joi.object({
      id: Joi.string().pattern(regex.address).required(),
      name: Joi.string().required(),
      slug: Joi.string().required(),
      metadata: Joi.object({
        imageUrl: Joi.string().allow(null),
        discordUrl: Joi.string().allow(null),
        description: Joi.string().allow(null),
        externalUrl: Joi.string().allow(null),
        bannerImageUrl: Joi.string().allow(null),
        twitterUsername: Joi.string().allow(null),
      }),
      royalties: Joi.array().items({
        recipient: Joi.string()
          .lowercase()
          .pattern(/^0x[a-fA-F0-9]{40}$/)
          .required(),
        bps: Joi.number().required(),
      }),
      allowlists: Joi.array().items(Joi.string().pattern(regex.address)),
    }),
  },
  handler: async (request: Request) => {
    const payload = request.payload as any;
    const apiKey = await ApiKeyManager.getApiKey(request.headers["x-api-key"]);

    if (_.isNull(apiKey)) {
      throw Boom.unauthorized("Invalid API key");
    }

    if (!apiKey.permissions?.override_collection_refresh_cool_down) {
      throw Boom.unauthorized("Not allowed");
    }

    try {
      await idb.oneOrNone(
        `
          UPDATE collections SET
            metadata = $/metadata:json/,
            name = $/name/,
            slug = $/slug/,
            updated_at = now()
          WHERE id = $/id/;
          UPDATE launchpad_contract SET
            allowlists = $/allowlists:json/,
            verified = $/verified/
          WHERE id = $/id/
        `,
        {
          id: payload.id,
          name: payload.name,
          slug: payload.slug,
          allowlists: payload.allowlists || [],
          verified: payload.verified || false,
          metadata: payload.metadata
        }
      );

      if (payload.royalties) {
        await updateRoyaltySpec(payload.id, "nftearth", payload.royalties);
        await royalties.refreshDefaultRoyalties(payload.id);
      }

      return { message: "Request accepted" };
    } catch (error) {
      logger.error(`post-update-launchpad-${version}-handler`, `Handler failure: ${error}`);
      throw error;
    }
  },
};

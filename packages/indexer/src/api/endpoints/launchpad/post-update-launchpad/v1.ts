/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";
import { logger } from "@/common/logger";
import { regex, toBuffer } from "@/common/utils";
import { idb } from "@/common/db";
import { updateRoyaltySpec } from "@/utils/royalties";
import * as royalties from "@/utils/royalties";

const version = "v1";

export const postUpdateLaunchpadV1Options: RouteOptions = {
  description: "Create Launchpad Contract",
  tags: ["api", "Contracts", "Launchpad"],
  plugins: {
    "hapi-swagger": {
      order: 1,
    },
  },
  validate: {
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
      allowlists: Joi.array().items(
        Joi.string().pattern(regex.address)
      )
    }),
  },
  response: {
    schema: Joi.object({
      id: Joi.string(),
    }).label(`postUpdateLaunchpad${version.toUpperCase()}Response`),
    failAction: (_request, _h, error) => {
      logger.error(
        `post-update-launchpad-${version}-handler`,
        `Wrong response schema: ${error}`
      );
      throw error;
    },
  },
  handler: async (request: Request) => {
    const payload = request.payload as any;

    try {
      await idb.oneOrNone(
        `
          UPDATE collections SET
            metadata = $/metadata:json/,
            name = $/name/,
            slug = $/slug/,
            updated_at = now()
          WHERE id = $/id/
          UPDATE launchpad_contract SET
            allowlists = $/allowlists:json/,
            verified = $/verified/
          WHERE id = $/id/
        `,
        {
          id: payload.id,
          contract: toBuffer(payload.id),
          bytecode: payload.bytecode,
          constructor_args: payload.constructor_args,
          deployer: toBuffer(payload.deployer),
          allowlists: payload.allowlists,
          verified: payload.verified
        }
      );

      if (payload.royalties) {
        await updateRoyaltySpec(payload.id, "nftearth", payload.royalties);
        await royalties.refreshDefaultRoyalties(payload.id);
      }

      return { message: "Request accepted" };
    } catch (error) {
      logger.error(
        `post-update-launchpad-${version}-handler`,
        `Handler failure: ${error}`
      );
      throw error;
    }
  },
};

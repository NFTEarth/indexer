/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";
import { logger } from "@/common/logger";
import { now, regex, toBuffer } from "@/common/utils";
import { idb } from "@/common/db";

const version = "v1";

export const postCreateLaunchpadV1Options: RouteOptions = {
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
      bytecode: Joi.string().required(),
      constructor_args: Joi.string().required(),
      deployer: Joi.string().pattern(regex.address).required(),
    }),
  },
  response: {
    schema: Joi.object({
      id: Joi.string(),
    }).label(`postCreateLaunchpad${version.toUpperCase()}Response`),
    failAction: (_request, _h, error) => {
      logger.error(
        `post-create-launchpad-${version}-handler`,
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
          INSERT INTO "launchpad_contract" (
            "id",
            "contract",
            "bytecode",
            "constructor_args",
            "deployer"
          ) VALUES (
            $/id/,
            $/contract/,
            $/bytecode/,
            $/constructor_args/,
            $/deployer/
          ) ON CONFLICT (id) DO UPDATE SET constructor_args = EXCLUDED."constructor_args"
          INSERT INTO "collections" (
            "id",
            "name",
            "contract",
            "minted_timestamp"
          ) VALUES (
            $/id/,
            $/name/,
            $/contract/,
            $/mintedTimestamp/
          ) ON CONFLICT DO NOTHING;
        `,
        {
          id: payload.id,
          name: payload.name,
          contract: toBuffer(payload.id),
          bytecode: payload.bytecode,
          constructor_args: payload.constructor_args,
          deployer: toBuffer(payload.deployer),
          mintedTimestamp: now(),
        }
      );
      return { message: "Request accepted" };
    } catch (error) {
      logger.error(
        `post-create-launchpad-${version}-handler`,
        `Handler failure: ${error}`
      );
      throw error;
    }
  },
};

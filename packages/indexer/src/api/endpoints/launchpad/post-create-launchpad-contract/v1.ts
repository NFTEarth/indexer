/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";
import { logger } from "@/common/logger";
import { regex, toBuffer } from "@/common/utils";
import { idb } from "@/common/db";

const version = "v1";

export const postCreateLaunchpadContractV1Options: RouteOptions = {
  description: "Create Launchpad Contract",
  tags: ["api", "Contracts"],
  plugins: {
    "hapi-swagger": {
      order: 1,
    },
  },
  validate: {
    payload: Joi.object({
      id: Joi.string().pattern(regex.address).required(),
      bytecode: Joi.string().required(),
      constructor_args: Joi.string().required(),
      deployer: Joi.string().pattern(regex.address).required(),
    }),
  },
  response: {
    schema: Joi.object({
      id: Joi.string(),
    }).label(`postCreateLaunchpadContract${version.toUpperCase()}Response`),
    failAction: (_request, _h, error) => {
      logger.error(
        `post-create-launchpad-contract-${version}-handler`,
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
            $/deployer/,
          ) ON CONFLICT DO NOTHING;
        `,
        {
          id: payload.id,
          contract: toBuffer(payload.contract),
          bytecode: payload.bytecode,
          constructor_args: payload.constructor_args,
          deployer: toBuffer(payload.deployer),
        }
      );
      return { id: payload.id };
    } catch (error) {
      logger.error(
        `post-create-launchpad-contract-${version}-handler`,
        `Handler failure: ${error}`
      );
      throw error;
    }
  },
};

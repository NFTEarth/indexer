/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";
import { logger } from "@/common/logger";
import { regex } from "@/common/utils";
import { idb, redb } from "@/common/db";
import { run } from "hardhat";
import * as Boom from "@hapi/boom";

const version = "v1";

export const postVerifyLaunchpadContractV1Options: RouteOptions = {
  description: "Create Verify Launchpad Contract",
  tags: ["api", "Contracts"],
  plugins: {
    "hapi-swagger": {
      order: 1,
    },
  },
  validate: {
    payload: Joi.object({
      id: Joi.string().pattern(regex.address).required(),
    }),
  },
  response: {
    schema: Joi.object({
      id: Joi.string(),
    }).label(`postVerifyLaunchpadContract${version.toUpperCase()}Response`),
    failAction: (_request, _h, error) => {
      logger.error(
        `post-verify-launchpad-contract-${version}-handler`,
        `Wrong response schema: ${error}`
      );
      throw error;
    },
  },
  handler: async (request: Request) => {
    const payload = request.payload as any;

    try {
      const contract = await redb.oneOrNone(
        `
        SELECT constructor_args FROM launchpad_contract WHERE id = $/id/
      `,
        {
          id: payload.id,
        }
      );

      if (!contract) {
        throw Boom.badRequest("Launchpad contract not found");
      }

      await run(`verify:verify`, {
        address: payload.id,
        constructorArguments: contract.constructor_args,
      }).catch((e) => {
        throw Boom.badRequest(e.message);
      });

      await idb.none(
        `
          UPDATE "launchpad_contract" SET verified = true WHERE id = $/id/
        `,
        {
          id: payload.id,
        }
      );
      return { id: payload.id };
    } catch (error) {
      logger.error(
        `post-verify-launchpad-contract-${version}-handler`,
        `Handler failure: ${error}`
      );
      throw error;
    }
  },
};

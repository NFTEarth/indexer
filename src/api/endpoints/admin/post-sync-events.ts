import * as Boom from "@hapi/boom";
import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";

import { logger } from "@/common/logger";
import { config } from "@/config/index";
import { addToEventsSyncBackfillQueue } from "@/jobs/events-sync";

export const postSyncEventsOptions: RouteOptions = {
  description: "Trigger syncing of events.",
  tags: ["api", "x-admin"],
  validate: {
    headers: Joi.object({
      "x-admin-api-key": Joi.string().required(),
    }).options({ allowUnknown: true }),
    payload: Joi.object({
      fromBlock: Joi.number().integer().positive().required(),
      toBlock: Joi.number().integer().positive().required(),
    }),
  },
  handler: async (request: Request) => {
    if (request.headers["x-admin-api-key"] !== config.adminApiKey) {
      throw Boom.unauthorized("Wrong or missing admin API key");
    }

    const payload = request.payload as any;

    try {
      const fromBlock = payload.fromBlock;
      const toBlock = payload.toBlock;

      await addToEventsSyncBackfillQueue(fromBlock, toBlock);

      return { message: "Request accepted" };
    } catch (error) {
      logger.error("post_sync_events_handler", `Handler failure: ${error}`);
      throw error;
    }
  },
};

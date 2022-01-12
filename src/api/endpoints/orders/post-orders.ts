import * as Boom from "@hapi/boom";
import { Request, RouteOptions } from "@hapi/hapi";
import * as Sdk from "@reservoir0x/sdk";
import Joi from "joi";

import { wyvernV2OrderFormat } from "@/api/types";
import { logger } from "@/common/logger";
import { config } from "@/config/index";
import * as wyvernV2 from "@/orders/wyvern-v2";

export const postOrdersOptions: RouteOptions = {
  description:
    "Submit a new signed order to the order book. Use the SDK to help build and sign orders.",
  tags: ["api"],
  validate: {
    payload: Joi.object().keys({
      orders: Joi.array().items(
        Joi.object().keys({
          kind: Joi.string().lowercase().valid("wyvern-v2").required(),
          data: Joi.object().when("kind", {
            is: Joi.equal("wyvern-v2"),
            then: wyvernV2OrderFormat,
          }),
          attribute: Joi.object({
            collection: Joi.string().required(),
            key: Joi.string().required(),
            value: Joi.string().required(),
          }),
        })
      ),
    }),
  },
  handler: async (request: Request) => {
    const payload = request.payload as any;

    if (!config.acceptOrders) {
      throw Boom.unauthorized("Not accepting orders");
    }

    try {
      const orders = payload.orders as any;

      const validOrderInfos: wyvernV2.OrderInfo[] = [];
      for (const { kind, data, attribute } of orders) {
        if (kind === "wyvern-v2") {
          try {
            const order = new Sdk.WyvernV2.Order(config.chainId, data);
            validOrderInfos.push({ order, attribute });
          } catch {
            // Skip any invalid orders
          }
        }
      }

      const filterResults = await wyvernV2.filterOrders(validOrderInfos);
      const saveResults = await wyvernV2.saveOrders(filterResults.valid);

      const result: { [hash: string]: string } = {};
      for (const { orderInfo, reason } of filterResults.invalid) {
        result[orderInfo.order.prefixHash()] = reason;
      }
      for (const { orderInfo, reason } of saveResults.invalid) {
        result[orderInfo.order.prefixHash()] = reason;
      }
      for (const orderInfo of saveResults.valid) {
        result[orderInfo.order.prefixHash()] = "Success";
      }

      return { orders: result };
    } catch (error) {
      logger.error("post_orders_handler", `Handler failure: ${error}`);
      throw error;
    }
  },
};

import * as Sdk from "@nftearth/sdk";
import axios from "axios";

import { logger } from "@/common/logger";
import { config } from "@/config/index";
import {
  RequestWasThrottledError,
  InvalidRequestError,
} from "@/jobs/orderbook/post-order-external/api/errors";
import { now } from "@/common/utils";

// Open Sea default rate limit - 2 requests per second for post apis
export const RATE_LIMIT_REQUEST_COUNT = 10000;
export const RATE_LIMIT_INTERVAL = 100;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const postOrder = async (order: Sdk.NFTEarth.Order, apiKey: string) => {
  const url = `https://nftearth.exchange/api/orderbook/${
    order.getInfo()?.side === "sell" ? "listings" : "offers"
  }`;

  // Skip posting orders that already expired
  if (order.params.endTime <= now()) {
    return;
  }

  await axios
    .post(
      url,
      JSON.stringify({
        parameters: {
          ...order.params,
          totalOriginalConsiderationItems: order.params.consideration.length,
        },
        chainId: order.chainId,
        signature: order.params.signature!,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": config.adminApiKey,
        },
      }
    )
    .catch((error) => {
      if (error.response) {
        logger.error(
          "nftearth_orderbook_api",
          `Failed to post order to NFTEarth. order=${JSON.stringify(order)}, status: ${
            error.response.status
          }, data:${JSON.stringify(error.response.data)}`
        );

        handleErrorResponse(error.response);
      }

      throw new Error(`Failed to post order to NFTEarth`);
    });
};

export const buildCollectionOffer = async (
  offerer: string,
  quantity: number,
  collectionSlug: string,
  _apiKey = ""
) => {
  //TODO: Store in database instad of calling API
  /* eslint-disable */
  const params = {
    offerer,
    quantity,
    collectionSlug,
  };
};

export const postCollectionOffer = async (
  order: Sdk.NFTEarth.Order,
  collectionSlug: string,
  apiKey: string
) => {
  const url = `https://nftearth.exchange/api/orderbook/offers`;
  const data = JSON.stringify({
    parameters: {
      ...order.params,
      totalOriginalConsiderationItems: order.params.consideration.length,
    },
    criteria: {
      collection: {
        slug: collectionSlug,
      },
    },
    chainId: order.chainId,
    signature: order.params.signature!,
  });

  await axios
    .post(url, data, {
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": config.adminApiKey,
      },
    })
    .catch((error) => {
      logger.error(
        "nftearth_orderbook_api",
        `Post NFTEarth collection offer error. order=${JSON.stringify(
          order
        )}, collectionSlug=${collectionSlug}, url=${url}, data=${data}, error=${error}`
      );

      if (error.response) {
        logger.error(
          "nftearth_orderbook_api",
          `Failed to post offer to NFTEarth. order=${JSON.stringify(
            order
          )}, collectionSlug=${collectionSlug}, url=${url}, data=${data}, status: ${
            error.response.status
          }, data:${JSON.stringify(error.response.data)}`
        );

        handleErrorResponse(error.response);
      }

      throw new Error(`Failed to post offer to NFTEarth`);
    });
};

// eslint-disable-next-line
const handleErrorResponse = (response: any) => {
  switch (response.status) {
    case 429: {
      let delay = RATE_LIMIT_INTERVAL;

      if (response.data.detail?.startsWith("Request was throttled. Expected available in")) {
        try {
          delay = response.data.detail.split(" ")[6] * 1000;
        } catch {
          // Skip on any errors
        }
      }

      throw new RequestWasThrottledError("Request was throttled by NFTEarth", delay);
    }
    case 400:
      throw new InvalidRequestError("Request was rejected by NFTEarth");
  }
};

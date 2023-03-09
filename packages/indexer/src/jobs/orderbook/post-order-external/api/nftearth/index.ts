import * as Sdk from "@nftearth/sdk";
import axios from "axios";

import { logger } from "@/common/logger";
import {
  RequestWasThrottledError,
  InvalidRequestError,
} from "@/jobs/orderbook/post-order-external/api/errors";
import { now } from "@/common/utils";
import { getUSDAndNativePrices } from "@/utils/prices";

// Open Sea default rate limit - 2 requests per second for post apis
export const RATE_LIMIT_REQUEST_COUNT = 10000;
export const RATE_LIMIT_INTERVAL = 100;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const postOrder = async (order: Sdk.NFTEarth.Order, apiKey: string) => {
  // Skip posting orders that already expired
  if (order.params.endTime <= now()) {
    return;
  }
  const isListing = order.getInfo()?.side === "sell";
  const url = `https://nftearth.exchange/api/orderbook/${isListing ? "listings" : "offers"}`;

  const priceData = await getUSDAndNativePrices(
    order.params[isListing ? "consideration" : "offer"][0].token,
    order.params[isListing ? "consideration" : "offer"][0].startAmount.toString(),
    order.params.startTime
  );

  await axios
    .post(
      url,
      JSON.stringify({
        parameters: {
          type: isListing ? "listing" : "offer",
          ...order.params,
          totalOriginalConsiderationItems: order.params.consideration.length,
          nativeValue: priceData,
        },
        chainId: order.chainId,
        signature: order.params.signature!,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
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

export const cancelOrder = async (order: Sdk.NFTEarth.Order, apiKey: string) => {
  const url = `https://nftearth.exchange/api/orderbook/cancel`;

  // Skip cancel orders that already expired
  if (order.params.endTime <= now()) {
    return;
  }

  const isListing = order.getInfo()?.side === "sell";

  const priceData = await getUSDAndNativePrices(
    order.params[isListing ? "consideration" : "offer"][0].token,
    order.params[isListing ? "consideration" : "offer"][0].startAmount.toString(),
    order.params.startTime
  );

  await axios
    .post(
      url,
      JSON.stringify({
        parameters: {
          type: isListing ? "listing" : "offer",
          ...order.params,
          totalOriginalConsiderationItems: order.params.consideration.length,
          nativeValue: priceData.nativePrice,
        },
        chainId: order.chainId,
        signature: order.params.signature!,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
      }
    )
    .catch((error) => {
      if (error.response) {
        logger.error(
          "nftearth_orderbook_api",
          `Failed to cancel order to NFTEarth. order=${JSON.stringify(order)}, status: ${
            error.response.status
          }, data:${JSON.stringify(error.response.data)}`
        );

        handleErrorResponse(error.response);
      }

      throw new Error(`Failed to cancel order to NFTEarth`);
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
  const isListing = order.getInfo()?.side === "sell";

  const priceData = await getUSDAndNativePrices(
    order.params[isListing ? "consideration" : "offer"][0].token,
    order.params[isListing ? "consideration" : "offer"][0].startAmount.toString(),
    order.params.startTime
  );

  const data = JSON.stringify({
    parameters: {
      ...order.params,
      totalOriginalConsiderationItems: order.params.consideration.length,
      nativeValue: priceData.nativePrice,
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
        "X-Api-Key": apiKey,
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

export const cancelCollectionOffer = async (
  order: Sdk.NFTEarth.Order,
  collectionSlug: string,
  apiKey: string
) => {
  const url = `https://nftearth.exchange/api/orderbook/cancel`;
  const isListing = order.getInfo()?.side === "sell";

  const priceData = await getUSDAndNativePrices(
    order.params[isListing ? "consideration" : "offer"][0].token,
    order.params[isListing ? "consideration" : "offer"][0].startAmount.toString(),
    order.params.startTime
  );

  const data = JSON.stringify({
    parameters: {
      ...order.params,
      totalOriginalConsiderationItems: order.params.consideration.length,
      nativeValue: priceData.nativePrice,
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
        "X-Api-Key": apiKey,
      },
    })
    .catch((error) => {
      logger.error(
        "nftearth_orderbook_api",
        `Post NFTEarth cancel collection offer error. order=${JSON.stringify(
          order
        )}, collectionSlug=${collectionSlug}, url=${url}, data=${data}, error=${error}`
      );

      if (error.response) {
        logger.error(
          "nftearth_orderbook_api",
          `Failed to cancel collection offer to NFTEarth. order=${JSON.stringify(
            order
          )}, collectionSlug=${collectionSlug}, url=${url}, data=${data}, status: ${
            error.response.status
          }, data:${JSON.stringify(error.response.data)}`
        );

        handleErrorResponse(error.response);
      }

      throw new Error(`Failed to cancel collection offer to NFTEarth`);
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

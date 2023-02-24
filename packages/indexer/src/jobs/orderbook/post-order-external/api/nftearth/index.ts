import * as Sdk from "@nftearth/sdk";
// import axios from "axios";
//
// import { logger } from "@/common/logger";
// import { config } from "@/config/index";
import {
  RequestWasThrottledError,
  InvalidRequestError,
} from "@/jobs/orderbook/post-order-external/api/errors";

// Open Sea default rate limit - 2 requests per second for post apis
export const RATE_LIMIT_REQUEST_COUNT = 10000;
export const RATE_LIMIT_INTERVAL = 100;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const postOrder = async (order: Sdk.NFTEarth.Order, _apiKey: string) => {
  //TODO: Store in database instad of calling API
  /* eslint-disable */
  const params = {
    parameters: {
      ...order.params,
      totalOriginalConsiderationItems: order.params.consideration.length,
    },
    signature: order.params.signature!,
  };
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
  _apiKey: string
) => {
  //TODO: Store in database instad of calling API
  /* eslint-disable */
  const params = {
    criteria: {
      collection: {
        slug: collectionSlug,
      },
    },
    protocol_data: {
      parameters: {
        ...order.params,
        totalOriginalConsiderationItems: order.params.consideration.length,
      },
      signature: order.params.signature!,
    },
  };
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

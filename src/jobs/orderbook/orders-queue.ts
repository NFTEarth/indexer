import { Job, Queue, QueueScheduler, Worker } from "bullmq";
import { randomUUID } from "crypto";

import { logger } from "@/common/logger";
import { redis } from "@/common/redis";
import { config } from "@/config/index";
import * as orders from "@/orderbook/orders";

const QUEUE_NAME = "orderbook-orders-queue";

export const queue = new Queue(QUEUE_NAME, {
  connection: redis.duplicate(),
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
    removeOnComplete: 10000,
    removeOnFail: 10000,
    timeout: 30000,
  },
});
new QueueScheduler(QUEUE_NAME, { connection: redis.duplicate() });

// BACKGROUND WORKER ONLY
if (config.doBackgroundWork) {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const { kind, info, relayToArweave } = job.data as GenericOrderInfo;

      try {
        switch (kind) {
          case "looks-rare": {
            const result = await orders.looksRare.save(
              [info as orders.looksRare.OrderInfo],
              relayToArweave
            );
            logger.info(QUEUE_NAME, `[looks-rare] Order save result: ${JSON.stringify(result)}`);

            break;
          }

          case "opendao": {
            const result = await orders.openDao.save(
              [info as orders.openDao.OrderInfo],
              relayToArweave
            );
            logger.info(QUEUE_NAME, `[opendao] Order save result: ${JSON.stringify(result)}`);

            break;
          }

          case "wyvern-v2.3": {
            const result = await orders.wyvernV23.save(
              [info as orders.wyvernV23.OrderInfo],
              relayToArweave
            );
            logger.info(QUEUE_NAME, `[wyvern-v2.3] Order save result: ${JSON.stringify(result)}`);

            break;
          }

          case "zeroex-v4": {
            const result = await orders.openDao.save(
              [info as orders.zeroExV4.OrderInfo],
              relayToArweave
            );
            logger.info(QUEUE_NAME, `[zeroex-v4] Order save result: ${JSON.stringify(result)}`);

            break;
          }
        }
      } catch (error) {
        logger.error(QUEUE_NAME, `Failed to process order ${job.data}: ${error}`);
        throw error;
      }
    },
    { connection: redis.duplicate(), concurrency: 10 }
  );
  worker.on("error", (error) => {
    logger.error(QUEUE_NAME, `Worker errored: ${error}`);
  });
}

export type GenericOrderInfo =
  | {
      kind: "wyvern-v2.3";
      info: orders.wyvernV23.OrderInfo;
      relayToArweave?: boolean;
    }
  | {
      kind: "looks-rare";
      info: orders.looksRare.OrderInfo;
      relayToArweave?: boolean;
    }
  | {
      kind: "opendao";
      info: orders.openDao.OrderInfo;
      relayToArweave?: boolean;
    }
  | {
      kind: "zeroex-v4";
      info: orders.zeroExV4.OrderInfo;
      relayToArweave?: boolean;
    };

export const addToQueue = async (orderInfos: GenericOrderInfo[], prioritized = false) => {
  await queue.addBulk(
    orderInfos.map((orderInfo) => ({
      name: randomUUID(),
      data: orderInfo,
      opts: {
        priority: prioritized ? 1 : undefined,
      },
    }))
  );
};

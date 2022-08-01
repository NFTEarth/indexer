/* eslint-disable @typescript-eslint/no-explicit-any */

import { HashZero } from "@ethersproject/constants";
import { Queue, QueueScheduler, Worker } from "bullmq";
import { randomUUID } from "crypto";

import { idb } from "@/common/db";
import { logger } from "@/common/logger";
import { redis, redlock } from "@/common/redis";
import { config } from "@/config/index";
import * as orderUpdatesById from "@/jobs/order-updates/by-id-queue";

const QUEUE_NAME = "backfill-cancel-wyvern-v23-orders";

export const queue = new Queue(QUEUE_NAME, {
  connection: redis.duplicate(),
  defaultJobOptions: {
    attempts: 10,
    removeOnComplete: 10000,
    removeOnFail: 10000,
  },
});
new QueueScheduler(QUEUE_NAME, { connection: redis.duplicate() });

// BACKGROUND WORKER ONLY
if (config.doBackgroundWork) {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { id } = job.data;
      const limit = 500;

      const results = await idb.manyOrNone(
        `
          WITH x AS (
            SELECT
              orders.id
            FROM orders
            WHERE orders.kind = 'wyvern-v2.3'
              AND (orders.fillability_status = 'fillable' OR orders.fillability_status = 'no-balance')
              AND orders.id > $/id/
            LIMIT $/limit/
          )
          UPDATE orders SET
            fillability_status = 'cancelled'
          FROM x
          WHERE orders.id = x.id
          RETURNING orders.id
        `,
        {
          id,
          limit,
        }
      );

      await orderUpdatesById.addToQueue(
        results.map(
          ({ id }) =>
            ({
              context: `cancelled-${id}`,
              id,
              trigger: {
                kind: "cancel",
              },
            } as orderUpdatesById.OrderInfo)
        )
      );

      if (results.length >= limit) {
        const lastResult = results[results.length - 1];
        await addToQueue(lastResult.number);
      }
    },
    { connection: redis.duplicate(), concurrency: 1 }
  );

  worker.on("error", (error) => {
    logger.error(QUEUE_NAME, `Worker errored: ${error}`);
  });

  redlock
    .acquire([`${QUEUE_NAME}-lock`], 60 * 60 * 24 * 30 * 1000)
    .then(async () => {
      await addToQueue(HashZero);
    })
    .catch(() => {
      // Skip on any errors
    });
}

export const addToQueue = async (id: string) => {
  await queue.add(randomUUID(), { id });
};

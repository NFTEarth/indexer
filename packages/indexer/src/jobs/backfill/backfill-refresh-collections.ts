import { Queue, QueueScheduler, Worker } from "bullmq";
import { randomUUID } from "crypto";

import { redb } from "@/common/db";
import { logger } from "@/common/logger";
import { redis, redlock } from "@/common/redis";
import { fromBuffer } from "@/common/utils";
import { config } from "@/config/index";
import { Collections } from "@/models/collections";

const QUEUE_NAME = "backfill-refresh-collections";

export const queue = new Queue(QUEUE_NAME, {
  connection: redis.duplicate(),
  defaultJobOptions: {
    attempts: 10,
    backoff: {
      type: "exponential",
      delay: 20000,
    },
    removeOnComplete: 1000,
    removeOnFail: 10000,
  },
});
new QueueScheduler(QUEUE_NAME, { connection: redis.duplicate() });

// BACKGROUND WORKER ONLY
if (config.doBackgroundWork) {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { day30Volume } = job.data;

      const limit = 100;
      const result = await redb.manyOrNone(
        `
          SELECT
            collections.contract,
            collections.day30_volume
          FROM collections
          WHERE collections.day30_volume < $/day30Volume/
          ORDER BY
            collections.day30_volume DESC
          LIMIT $/limit/
        `,
        { limit, day30Volume }
      );

      for (const { contract } of result) {
        await Collections.recalculateContractFloorSell(fromBuffer(contract));
      }

      if (result.length >= limit) {
        const lastResult = result[result.length - 1];
        await addToQueue(lastResult.day30_volume);
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
      await addToQueue();
    })
    .catch(() => {
      // Skip on any errors
    });
}

export const addToQueue = async (day30Volume = "1000000000000000000000000") => {
  await queue.add(randomUUID(), { day30Volume });
};

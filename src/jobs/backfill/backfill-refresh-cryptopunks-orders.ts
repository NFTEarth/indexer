/* eslint-disable @typescript-eslint/no-explicit-any */

import { Interface } from "@ethersproject/abi";
import { HashZero } from "@ethersproject/constants";
import { Contract } from "@ethersproject/contracts";
import { Queue, QueueScheduler, Worker } from "bullmq";
import { randomUUID } from "crypto";

import { idb } from "@/common/db";
import { logger } from "@/common/logger";
import { baseProvider } from "@/common/provider";
import { redis, redlock } from "@/common/redis";
import { config } from "@/config/index";

const QUEUE_NAME = "backfill-refresh-cryptopunks-orders";

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
      const { orderId } = job.data;

      const limit = 50;
      const result = await idb.manyOrNone(
        `
          SELECT
            orders.id,
            orders.token_set_id
          FROM orders
          WHERE orders.kind = 'cryptopunks'
            AND orders.contract IS NOT NULL
            AND orders.id > $/orderId/
          ORDER BY orders.id
          LIMIT $/limit/;
        `,
        { limit, orderId }
      );

      const contract = new Contract(
        "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb",
        new Interface([
          `function punksOfferedForSale(uint256 tokenId) view returns (
            bool isForSale,
            uint256 tokenId,
            address seller,
            uint256 minValue,
            address onlySellTo
          )`,
        ]),
        baseProvider
      );

      const values: any[] = [];
      // const columns = new pgp.helpers.ColumnSet(["id", "fillability_status", "approval_status"], {
      //   table: "orders",
      // });
      for (const { id, token_set_id } of result) {
        const offer = await contract.punksOfferedForSale(token_set_id.split(":")[2]);
        if (offer.isForSale) {
          values.push({
            id,
            fillability_status: "fillable",
            approval_status: "approved",
          });
        } else {
          values.push({
            id,
            fillability_status: "filled",
            approval_status: "approved",
          });
        }
      }

      if (values.length) {
        for (const value of values) {
          logger.info(QUEUE_NAME, JSON.stringify({ value }));
        }
        // await idb.none(
        //   `
        //     UPDATE orders SET
        //       fillability_status = x.fillability_status::order_fillability_status_t,
        //       approval_status = x.approval_status::order_approval_status_t
        //     FROM (
        //       VALUES ${pgp.helpers.values(values, columns)}
        //     ) AS x(id, fillability_status, approval_status)
        //     WHERE orders.id = x.id::TEXT
        //   `
        // );
      }

      if (result.length >= limit) {
        const lastResult = result[result.length - 1];
        await addToQueue(lastResult.id);
      }
    },
    { connection: redis.duplicate(), concurrency: 1 }
  );

  worker.on("error", (error) => {
    logger.error(QUEUE_NAME, `Worker errored: ${error}`);
  });

  if (config.chainId === 1) {
    redlock
      .acquire([`${QUEUE_NAME}-lock-1`], 60 * 60 * 24 * 30 * 1000)
      .then(async () => {
        await addToQueue(HashZero);
      })
      .catch(() => {
        // Skip on any errors
      });
  }
}

export const addToQueue = async (orderId: string) => {
  await queue.add(randomUUID(), { orderId });
};

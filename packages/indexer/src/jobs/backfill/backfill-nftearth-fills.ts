/* eslint-disable @typescript-eslint/no-explicit-any */

import * as Sdk from "@nftearth/sdk";
import { Queue, QueueScheduler, Worker } from "bullmq";
import { randomUUID } from "crypto";

import { idb, pgp, redb } from "@/common/db";
import { logger } from "@/common/logger";
import { redis } from "@/common/redis";
import { bn, fromBuffer, toBuffer } from "@/common/utils";
import { config } from "@/config/index";
import { orderFulfilled } from "@/events-sync/data/nftearth";
import * as syncEventsUtils from "@/events-sync/utils";
import { getUSDAndNativePrices } from "@/utils/prices";

const QUEUE_NAME = "backfill-nftearth-sales";

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
      const { txHash, logIndex, batchIndex } = job.data;

      const limit = 20;
      const result = await redb.manyOrNone(
        `
          SELECT
            fill_events_2.tx_hash,
            fill_events_2.log_index,
            fill_events_2.batch_index,
            fill_events_2.timestamp
          FROM fill_events_2
          WHERE (fill_events_2.tx_hash, fill_events_2.log_index, fill_events_2.batch_index) < ($/txHash/, $/logIndex/, $/batchIndex/)
            AND fill_events_2.order_kind = 'nftearth'
          ORDER BY
            fill_events_2.tx_hash DESC,
            fill_events_2.log_index DESC,
            fill_events_2.batch_index DESC
          LIMIT $/limit/
        `,
        { txHash: toBuffer(txHash), logIndex, batchIndex, limit }
      );

      const values: any[] = [];
      const columns = new pgp.helpers.ColumnSet(
        ["tx_hash", "log_index", "batch_index", "price", "usd_price"],
        {
          table: "fill_events_2",
        }
      );
      for (const { tx_hash, log_index, batch_index, timestamp } of result) {
        const logs = await syncEventsUtils.fetchTransactionLogs(fromBuffer(tx_hash));
        for (const log of logs.logs) {
          if (log.logIndex === log_index) {
            const parsedLog = orderFulfilled.abi.parseLog(log);
            const offer = parsedLog.args["offer"];
            const consideration = parsedLog.args["consideration"];

            const saleInfo = new Sdk.NFTEarth.Exchange(config.chainId).deriveBasicSale(
              offer,
              consideration
            );

            if (saleInfo) {
              const currency = saleInfo.paymentToken;
              const currencyPrice = bn(saleInfo.price).div(saleInfo.amount).toString();
              const priceData = await getUSDAndNativePrices(currency, currencyPrice, timestamp);

              values.push({
                tx_hash,
                log_index,
                batch_index,
                price: currencyPrice,
                usd_price: priceData.usdPrice!,
              });
            }
          }
        }
      }

      if (values.length) {
        await idb.none(
          `
            UPDATE fill_events_2 SET
              price = x.price::NUMERIC(78, 0),
              currency_price = x.price::NUMERIC(78, 0),
              usd_price = x.usd_price::NUMERIC(78, 0),
              updated_at = now()
            FROM (
              VALUES ${pgp.helpers.values(values, columns)}
            ) AS x(tx_hash, log_index, batch_index, price, usd_price)
            WHERE fill_events_2.tx_hash = x.tx_hash::BYTEA
              AND fill_events_2.log_index = x.log_index::INT
              AND fill_events_2.batch_index = x.batch_index::INT
          `
        );
      }

      if (result.length >= limit) {
        const lastResult = result[result.length - 1];
        await addToQueue(
          fromBuffer(lastResult.tx_hash),
          lastResult.log_index,
          lastResult.batch_index
        );
      }
    },
    { connection: redis.duplicate(), concurrency: 1 }
  );

  worker.on("error", (error) => {
    logger.error(QUEUE_NAME, `Worker errored: ${error}`);
  });
}

export const addToQueue = async (txHash: string, logIndex: number, batchIndex: number) => {
  await queue.add(randomUUID(), { txHash, logIndex, batchIndex }, { delay: 5 * 1000 });
};

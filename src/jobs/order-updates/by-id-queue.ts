import { HashZero } from "@ethersproject/constants";
import { Job, Queue, QueueScheduler, Worker } from "bullmq";

import { db } from "@/common/db";
import { logger } from "@/common/logger";
import { redis } from "@/common/redis";
import { fromBuffer } from "@/common/utils";
import { config } from "@/config/index";
import * as tokenFloorSellApiEvents from "@/jobs/api-events/token-floor-sell-queue";
import { TriggerKind } from "@/jobs/order-updates/types";

const QUEUE_NAME = "order-updates-by-id";

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
  },
});
new QueueScheduler(QUEUE_NAME, { connection: redis.duplicate() });

// BACKGROUND WORKER ONLY
if (config.doBackgroundWork) {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const { id, trigger } = job.data as OrderInfo;

      try {
        // Fetch the order's associated token set
        const data: {
          side: string | null;
          token_set_id: string | null;
        } | null = await db.oneOrNone(
          `
            SELECT
              "o"."side",
              "o"."token_set_id"
            FROM "orders" "o"
            WHERE "o"."id" = $/id/
          `,
          { id }
        );

        if (data && data.side && data.token_set_id) {
          const side = data.side;
          const tokenSetId = data.token_set_id;

          // Recompute `top_buy` for token sets that are not single token
          if (side === "buy" && !tokenSetId.startsWith("token")) {
            await db.none(
              `
                WITH "x" AS (
                  SELECT
                    "ts"."id" as "token_set_id",
                    "y".*
                  FROM "token_sets" "ts"
                  LEFT JOIN LATERAL (
                    SELECT
                      "o"."id" as "order_id",
                      "o"."value",
                      "o"."maker"
                    FROM "orders" "o"
                    WHERE "o"."token_set_id" = "ts"."id"
                      AND "o"."side" = 'buy'
                      AND "o"."fillability_status" = 'fillable'
                      AND "o"."approval_status" = 'approved'
                    ORDER BY "o"."value" DESC
                    LIMIT 1
                  ) "y" ON TRUE
                  WHERE "ts"."id" = $/tokenSetId/
                )
                UPDATE "token_sets" AS "ts" SET
                  "top_buy_id" = "x"."order_id",
                  "top_buy_value" = "x"."value",
                  "top_buy_maker" = "x"."maker"
                FROM "x"
                WHERE "ts"."id" = "x"."order_id"
                  AND "ts"."top_buy_id" IS DISTINCT FROM "x"."order_id"
              `,
              { tokenSetId }
            );
          }

          // TODO: Research if splitting the single token updates in multiple
          // batches is needed (eg. to avoid blocking other running queries).

          if (data.side === "sell") {
            const result = await db.oneOrNone(
              `
                WITH "z" AS (
                  SELECT
                    "x"."contract",
                    "x"."token_id",
                    "y"."order_id",
                    "y"."value",
                    "y"."maker"
                  FROM (
                    SELECT
                      "tst"."contract",
                      "tst"."token_id"
                    FROM "orders" "o"
                    JOIN "token_sets_tokens" "tst"
                      ON "o"."token_set_id" = "tst"."token_set_id"
                    WHERE "o"."id" = $/id/
                  ) "x" LEFT JOIN LATERAL (
                    SELECT
                      "o"."id" as "order_id",
                      "o"."value",
                      "o"."maker"
                    FROM "orders" "o"
                    JOIN "token_sets_tokens" "tst"
                      ON "o"."token_set_id" = "tst"."token_set_id"
                    WHERE "tst"."contract" = "x"."contract"
                      AND "tst"."token_id" = "x"."token_id"
                      AND "o"."side" = 'sell'
                      AND "o"."fillability_status" = 'fillable'
                      AND "o"."approval_status" = 'approved'
                    ORDER BY "o"."value"
                    LIMIT 1
                  ) "y" ON TRUE
                )
                UPDATE "tokens" AS "t" SET
                  "floor_sell_id" = "z"."order_id",
                  "floor_sell_value" = "z"."value",
                  "floor_sell_maker" = "z"."maker"
                FROM "z"
                WHERE "t"."contract" = "z"."contract"
                  AND "t"."token_id" = "z"."token_id"
                  AND "t"."floor_sell_id" IS DISTINCT FROM "z"."order_id"
                RETURNING
                  (
                    SELECT "t"."floor_sell_value" FROM "tokens" "t"
                    WHERE "t"."contract" = "z"."contract"
                      AND "t"."token_id" = "z"."token_id"
                  ) AS "old_floor_sell_value",
                  "z"."contract",
                  "z"."token_id",
                  "z"."order_id" AS "new_floor_sell_id",
                  "z"."value" AS "new_floor_sell_value",
                  "z"."maker" AS "new_floor_sell_maker"
              `,
              { id }
            );

            if (result) {
              // Emit an api event for every floor sell update
              await tokenFloorSellApiEvents.addToQueue([
                {
                  kind: trigger.kind,
                  contract: fromBuffer(result.contract),
                  tokenId: result.token_id,
                  orderId: result.new_floor_sell_id,
                  maker: result.new_floor_sell_maker
                    ? fromBuffer(result.new_floor_sell_maker)
                    : null,
                  price: result.new_floor_sell_value,
                  previousPrice: result.old_floor_sell_value,
                  txHash: trigger.txHash,
                  txTimestamp: trigger.txTimestamp,
                },
              ]);
            }
          } else if (data.side === "buy") {
            await db.none(
              `
                WITH "z" AS (
                  SELECT
                    "x"."contract",
                    "x"."token_id",
                    "y"."order_id",
                    "y"."value",
                    "y"."maker"
                  FROM (
                    SELECT
                      "tst"."contract",
                      "tst"."token_id"
                    FROM "orders" "o"
                    JOIN "token_sets_tokens" "tst"
                      ON "o"."token_set_id" = "tst"."token_set_id"
                    WHERE "o"."id" = $/id/
                  ) "x" LEFT JOIN LATERAL (
                    SELECT
                      "o"."id" as "order_id",
                      "o"."value",
                      "o"."maker"
                    FROM "orders" "o"
                    JOIN "token_sets_tokens" "tst"
                      ON "o"."token_set_id" = "tst"."token_set_id"
                    WHERE "tst"."contract" = "x"."contract"
                      AND "tst"."token_id" = "x"."token_id"
                      AND "o"."side" = 'buy'
                      AND "o"."fillability_status" = 'fillable'
                      AND "o"."approval_status" = 'approved'
                      AND EXISTS(
                        SELECT FROM "nft_balances" "nb"
                          WHERE "nb"."contract" = "x"."contract"
                          AND "nb"."token_id" = "x"."token_id"
                          AND "nb"."amount" > 0
                          AND "nb"."owner" != "o"."maker"
                      )
                    ORDER BY "o"."value" DESC
                    LIMIT 1
                  ) "y" ON TRUE
                )
                UPDATE "tokens" AS "t" SET
                  "top_buy_id" = "z"."order_id",
                  "top_buy_value" = "z"."value",
                  "top_buy_maker" = "z"."maker"
                FROM "z"
                WHERE "t"."contract" = "z"."contract"
                  AND "t"."token_id" = "z"."token_id"
                  AND "t"."top_buy_id" IS DISTINCT FROM "z"."order_id"
              `,
              { id }
            );
          }
        }
      } catch (error) {
        logger.error(
          QUEUE_NAME,
          `Failed to handle order info ${JSON.stringify(job.data)}: ${error}`
        );
        throw error;
      }
    },
    { connection: redis.duplicate(), concurrency: 10 }
  );
  worker.on("error", (error) => {
    logger.error(QUEUE_NAME, `Worker errored: ${error}`);
  });
}

export type OrderInfo = {
  // The context represents a deterministic id for what triggered
  // the job in the first place. Since this is what's going to be
  // set as the id of the job, the queue is only going to process
  // a context once (further jobs that have the same context will
  // be ignored - as long as the queue still holds past jobs with
  // the same context). It is VERY IMPORTANT to have this in mind
  // and set the contexts distinctive enough so that jobs are not
  // going to be wrongfully ignored. However, to be as performant
  // as possible it's also important to not have the contexts too
  // distinctive in order to avoid doing duplicative work.
  context: string;
  id: string;
  // Information regarding what triggered the job
  trigger: {
    kind: TriggerKind;
    txHash?: string;
    txTimestamp?: number;
  };
};

export const addToQueue = async (orderInfos: OrderInfo[]) => {
  // Ignore empty orders
  orderInfos = orderInfos.filter(({ id }) => id !== HashZero);

  await queue.addBulk(
    orderInfos.map((orderInfo) => ({
      name: orderInfo.id,
      data: orderInfo,
      opts: {
        // We should make sure not to perform any expensive work more
        // than once. As such, we keep the last performed jobs in the
        // queue and give all jobs a deterministic id so that we skip
        // handling jobs that already got executed.
        jobId: orderInfo.context,
      },
    }))
  );
};

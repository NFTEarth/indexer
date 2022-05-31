/* eslint-disable @typescript-eslint/no-explicit-any */

import _ from "lodash";
import { Job, Queue, QueueScheduler, Worker } from "bullmq";
import { randomUUID } from "crypto";

import { logger } from "@/common/logger";
import { redis } from "@/common/redis";
import { config } from "@/config/index";
import { SaleActivity, FillEventData } from "@/jobs/activities/sale-activity";
import { TransferActivity, NftTransferEventData } from "@/jobs/activities/transfer-activity";
import { ListingActivity, NewSellOrderEventData } from "@/jobs/activities/listing-activity";
import { BidActivity, NewBuyOrderEventData } from "@/jobs/activities/bid-activity";
import {
  BidCancelActivity,
  BuyOrderCancelledEventData,
} from "@/jobs/activities/bid-cancel-activity";
import {
  ListingCancelActivity,
  SellOrderCancelledEventData,
} from "@/jobs/activities/listing-cancel-activity";

const QUEUE_NAME = "process-activity-event-queue";

export const queue = new Queue(QUEUE_NAME, {
  connection: redis.duplicate(),
  defaultJobOptions: {
    attempts: 10,
    removeOnComplete: 100,
    removeOnFail: 20000,
  },
});
new QueueScheduler(QUEUE_NAME, { connection: redis.duplicate() });

// BACKGROUND WORKER ONLY
if (config.doBackgroundWork) {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const { kind, data } = job.data as EventInfo;

      switch (kind) {
        case EventKind.fillEvent:
          await SaleActivity.handleEvent(data as FillEventData);
          break;
        case EventKind.nftTransferEvent:
          await TransferActivity.handleEvent(data as NftTransferEventData);
          break;
        case EventKind.newSellOrder:
          await ListingActivity.handleEvent(data as NewSellOrderEventData);
          break;
        case EventKind.newBuyOrder:
          await BidActivity.handleEvent(data as NewBuyOrderEventData);
          break;
        case EventKind.buyOrderCancelled:
          await BidCancelActivity.handleEvent(data as BuyOrderCancelledEventData);
          break;
        case EventKind.sellOrderCancelled:
          await ListingCancelActivity.handleEvent(data as SellOrderCancelledEventData);
          break;
      }
    },
    { connection: redis.duplicate(), concurrency: 1 }
  );

  worker.on("error", (error) => {
    logger.error(QUEUE_NAME, `Worker errored: ${error}`);
  });
}

export enum EventKind {
  fillEvent = "fillEvent",
  nftTransferEvent = "nftTransferEvent",
  newSellOrder = "newSellOrder",
  newBuyOrder = "newBuyOrder",
  sellOrderCancelled = "sellOrderCancelled",
  buyOrderCancelled = "buyOrderCancelled",
}

export type EventInfo =
  | {
      kind: EventKind.newSellOrder;
      data: NewSellOrderEventData;
    }
  | {
      kind: EventKind.newBuyOrder;
      data: NewBuyOrderEventData;
    }
  | {
      kind: EventKind.nftTransferEvent;
      data: NftTransferEventData;
    }
  | {
      kind: EventKind.fillEvent;
      data: FillEventData;
    }
  | {
      kind: EventKind.sellOrderCancelled;
      data: SellOrderCancelledEventData;
    }
  | {
      kind: EventKind.buyOrderCancelled;
      data: BuyOrderCancelledEventData;
    };

export const addToQueue = async (events: EventInfo[]) => {
  await queue.addBulk(
    _.map(events, (event) => ({
      name: randomUUID(),
      data: event,
    }))
  );
};

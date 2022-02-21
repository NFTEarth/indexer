import * as Sdk from "@reservoir0x/sdk";
import cron from "node-cron";

import { logger } from "@/common/logger";
import { arweaveGateway } from "@/common/provider";
import { redlock, redis } from "@/common/redis";
import { config } from "@/config/index";

const PENDING_DATA_KEY = "pending-arweave-data";

export const addPendingOrdersWyvernV23 = async (
  data: { order: Sdk.WyvernV23.Order; schemaHash?: string }[]
) => {
  if (config.arweaveRelayerKey && data.length) {
    await redis.rpush(
      PENDING_DATA_KEY,
      ...data.map(({ order, schemaHash }) =>
        JSON.stringify({
          kind: "wyvern-v2.3",
          data: {
            ...order.params,
            schemaHash,
          },
        })
      )
    );
  }
};

// BACKGROUND WORKER ONLY
if (config.doBackgroundWork && config.arweaveRelayerKey) {
  cron.schedule(
    "*/1 * * * *",
    async () =>
      await redlock
        .acquire(["arweave-relay-lock"], (60 - 5) * 1000)
        .then(async () => {
          logger.info("arweave-relay", "Relaying pending data");

          try {
            const batchSize = 5000;
            const batch = await redis.lrange(PENDING_DATA_KEY, 0, batchSize);
            if (batch.length) {
              const wallet = JSON.parse(config.arweaveRelayerKey!);
              const transaction = await arweaveGateway.createTransaction(
                {
                  data: JSON.stringify(batch.map((b) => JSON.parse(b))),
                },
                wallet
              );
              transaction.addTag("Content-Type", "application/json");
              transaction.addTag("App-Name", `Reservoir Protocol`);
              transaction.addTag("App-Version", "0.0.1");
              transaction.addTag(
                "Network",
                config.chainId === 1 ? "mainnet" : "rinkeby"
              );

              await arweaveGateway.transactions
                .sign(transaction, wallet)
                .then(async () => {
                  const uploader =
                    await arweaveGateway.transactions.getUploader(transaction);
                  while (!uploader.isComplete) {
                    await uploader.uploadChunk();
                  }
                });

              logger.info(
                "arweave-relay",
                `${batch.length} pending data entries relayed via transaction ${transaction.id}`
              );

              await redis.ltrim(PENDING_DATA_KEY, batchSize, -1);
            } else {
              logger.info("arweave-relay", "No pending data to relay");
            }
          } catch (error) {
            logger.error(
              "arweave-relay",
              `Failed to relay pending data: ${error}`
            );
          }
        })
  );
}

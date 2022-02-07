import { db, pgp } from "@/common/db";
import { BaseEventParams } from "@/events-sync/parser";

// TODO: Support for than one kind (for now, `wyvern-v2`)
export type Event = {
  orderId: string;
  baseEventParams: BaseEventParams;
};

export const addEvents = async (events: Event[]) => {
  const cancelValues: any[] = [];
  for (const event of events) {
    cancelValues.push({
      address: event.baseEventParams.address,
      block: event.baseEventParams.block,
      block_hash: event.baseEventParams.blockHash,
      tx_hash: event.baseEventParams.txHash,
      tx_index: event.baseEventParams.txIndex,
      log_index: event.baseEventParams.logIndex,
      timestamp: event.baseEventParams.timestamp,
      order_id: event.orderId,
    });
  }

  const queries: string[] = [];

  if (cancelValues.length) {
    const columns = new pgp.helpers.ColumnSet(
      [
        "address",
        "block",
        "block_hash",
        "tx_hash",
        "tx_index",
        "log_index",
        "timestamp",
        "order_id",
      ],
      { table: "cancel_events" }
    );

    // Atomically insert the cancel events and update order statuses
    queries.push(`
      WITH "x" AS (
        INSERT INTO "cancel_events" (
          "address",
          "block",
          "block_hash",
          "tx_hash",
          "tx_index",
          "log_index",
          "timestamp",
          "order_id"
        ) VALUES ${pgp.helpers.values(cancelValues, columns)}
        ON CONFLICT DO NOTHING
        RETURNING "order_id"
      )
      INSERT INTO "orders" (
        "id",
        "kind",
        "fillability_status",
        "created_at",
        "updated_at"
      ) ( 
        SELECT
          "x"."order_id",
          'wyvern-v2'::order_kind_t,
          'cancelled'::order_fillability_status_t,
          now(),
          now()
        FROM "x"
      )
      ON CONFLICT ("id") DO
      UPDATE SET "fillability_status" = 'cancelled', "updated_at" = now()
    `);
  }

  if (queries.length) {
    // No need to buffer through the write queue since there
    // are no chances of database deadlocks in this scenario
    await db.none(pgp.helpers.concat(queries));
  }
};

export const removeEvents = async (blockHash: Buffer) => {
  // Delete the cancel events but skip reverting order status updates
  // since it's not possible to know what to revert to and even if we
  // knew, it might mess up other higher-level order processes.
  await db.any(
    `DELETE FROM "cancel_events" WHERE "block_hash" = $/blockHash/`,
    { blockHash }
  );
};

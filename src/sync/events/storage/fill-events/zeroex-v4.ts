import { idb, pgp } from "@/common/db";
import { toBuffer } from "@/common/utils";
import { DbEvent, Event } from "@/events-sync/storage/fill-events";

// To be used only for erc1155 orders (which are partially fillable).
export const addEventsZeroExV4 = async (events: Event[]) => {
  const fillValues: DbEvent[] = [];
  for (const event of events) {
    fillValues.push({
      address: toBuffer(event.baseEventParams.address),
      block: event.baseEventParams.block,
      block_hash: toBuffer(event.baseEventParams.blockHash),
      tx_hash: toBuffer(event.baseEventParams.txHash),
      tx_index: event.baseEventParams.txIndex,
      log_index: event.baseEventParams.logIndex,
      timestamp: event.baseEventParams.timestamp,
      batch_index: event.baseEventParams.batchIndex,
      order_kind: event.orderKind,
      order_id: event.orderId || null,
      order_side: event.orderSide,
      maker: toBuffer(event.maker),
      taker: toBuffer(event.taker),
      price: event.price,
      contract: toBuffer(event.contract),
      token_id: event.tokenId,
      amount: event.amount,
    });
  }

  if (fillValues.length) {
    const columns = new pgp.helpers.ColumnSet(
      [
        "address",
        "block",
        "block_hash",
        "tx_hash",
        "tx_index",
        "log_index",
        "timestamp",
        "batch_index",
        "order_kind",
        "order_id",
        "order_side",
        "maker",
        "taker",
        "price",
        "contract",
        "token_id",
        "amount",
      ],
      { table: "fill_events_2" }
    );

    // Atomically insert the fill events and update order statuses
    await idb.none(`
      WITH x AS (
        INSERT INTO fill_events_2 (
          address,
          block,
          block_hash,
          tx_hash,
          tx_index,
          log_index,
          timestamp,
          batch_index,
          order_kind,
          order_id,
          order_side,
          maker,
          taker,
          price,
          contract,
          token_id,
          amount
        ) VALUES ${pgp.helpers.values(fillValues, columns)}
        ON CONFLICT DO NOTHING
        RETURNING
          fill_events_2.order_kind,
          fill_events_2.order_id,
          fill_events_2.timestamp,
          fill_events_2.amount
      )
      INSERT INTO orders (
        id,
        kind,
        quantity_filled,
        fillability_status,
        expiration
      ) (
        SELECT
          x.order_id,
          x.order_kind,
          x.amount,
          'filled'::order_fillability_status_t,
          to_timestamp(x.timestamp)
        FROM x
        WHERE x.order_id IS NOT NULL
      )
      ON CONFLICT (id) DO
      UPDATE SET
        fillability_status = (
          CASE
            WHEN orders.quantity_remaining <= EXCLUDED.quantity_filled THEN 'filled'
            ELSE orders.fillability_status
          END
        ),
        quantity_remaining = orders.quantity_remaining - EXCLUDED.quantity_filled,
        quantity_filled = orders.quantity_filled + EXCLUDED.quantity_filled,
        expiration = (
          CASE
            WHEN orders.quantity_remaining <= EXCLUDED.quantity_filled THEN EXCLUDED.expiration
            ELSE orders.expiration
          END
        ),
        updated_at = now()
    `);
  }
};

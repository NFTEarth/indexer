import { HashZero } from "@ethersproject/constants";

import { formatEth } from "@/common/bignumber";
import { db } from "@/common/db";

export type GetSalesFilter = {
  contract?: string;
  tokenId?: string;
  collection?: string;
  attributes?: { [key: string]: string };
  user?: string;
  direction?: "from" | "to";
  side?: "buy" | "sell";
  offset: number;
  limit: number;
};

export type GetSalesResponse = {
  token: {
    contract: string;
    tokenId: string;
    name: string | null;
    image: string;
    collection: {
      id: string;
      name: string;
    };
  };
  from: string;
  to: string;
  amount: number;
  txHash: string;
  block: number;
  timestamp: number;
  price: number | null;
  tokenSetId: string;
  schema: any;
}[];

export const getSales = async (
  filter: GetSalesFilter
): Promise<GetSalesResponse> => {
  let baseQuery = `
    select
      "nte"."address",
      "nte"."token_id",
      "t"."name",
      "t"."image",
      "c"."id" as "collection_id",
      "c"."name" as "collection_name",
      "nte"."from",
      "nte"."to",
      "nte"."amount",
      "nte"."tx_hash" as "txHash",
      "nte"."block",
      coalesce("b"."timestamp", extract(epoch from now())::int) as "timestamp",
      "fe"."price",
      "o"."token_set_id" as "token_set_id",
      "ts"."label" as "schema"
    from "nft_transfer_events" "nte"
    join "fill_events" "fe"
      on "nte"."tx_hash" = "fe"."tx_hash"
      and "nte"."from" = "fe"."maker"
    join "tokens" "t"
      on "nte"."address" = "t"."contract"
      and "nte"."token_id" = "t"."token_id"
    join "collections" "c"
      on "t"."collection_id" = "c"."id"
    join "orders" "o"
      on ("fe"."buy_order_hash" = "o"."hash" or "fe"."sell_order_hash" = "o"."hash")
    join "token_sets" "ts"
      on "o"."token_set_id" = "ts"."id"
    left join "blocks" "b"
      on "fe"."block" = "b"."block"
  `;

  // Filters
  const conditions: string[] = [`"o"."token_set_id" is not null`];
  if (filter.contract) {
    conditions.push(`"nte"."address" = $/contract/`);
  }
  if (filter.tokenId) {
    conditions.push(`"nte"."token_id" = $/tokenId/`);
  }
  if (filter.collection) {
    conditions.push(`"t"."collection_id" = $/collection/`);
  }
  if (filter.attributes) {
    Object.entries(filter.attributes).forEach(([key, value], i) => {
      conditions.push(`
        exists(
          select from "attributes" "a"
          where "a"."contract" = "nte"."address"
            and "a"."token_id" = "nte"."token_id"
            and "a"."key" = $/key${i}/
            and "a"."value" = $/value${i}/
        )
      `);
      (filter as any)[`key${i}`] = key;
      (filter as any)[`value${i}`] = value;
    });
  }
  if (filter.user) {
    if (filter.direction === "from") {
      conditions.push(`"nte"."from" = $/user/`);
    } else if (filter.direction === "to") {
      conditions.push(`"nte"."to" = $/user/`);
    } else {
      conditions.push(`"nte"."from" = $/user/ or "nte"."to" = $/user/`);
    }
  }
  if (filter.side === "buy") {
    conditions.push(
      `"fe"."sell_order_hash" = '${HashZero}' and "fe"."buy_order_hash" != '${HashZero}'`
    );
  } else if (filter.side === "sell") {
    conditions.push(
      `"fe"."sell_order_hash" != '${HashZero}' and "fe"."buy_order_hash" = '${HashZero}'`
    );
  }
  if (conditions.length) {
    baseQuery += " where " + conditions.map((c) => `(${c})`).join(" and ");
  }

  // Sorting
  baseQuery += ` order by "fe"."block" desc nulls last`;

  // Pagination
  baseQuery += ` offset $/offset/`;
  baseQuery += ` limit $/limit/`;

  return db.manyOrNone(baseQuery, filter).then((result) =>
    result.map((r) => ({
      token: {
        contract: r.contract,
        tokenId: r.token_id,
        name: r.name,
        image: r.mage,
        collection: {
          id: r.collection_id,
          name: r.collection_name,
        },
      },
      from: r.from,
      to: r.to,
      amount: Number(r.amount),
      txHash: r.txHash,
      block: r.block,
      timestamp: r.timestamp,
      price: r.price ? formatEth(r.price) : null,
      tokenSetId: r.token_set_id,
      schema: r.schema,
    }))
  );
};

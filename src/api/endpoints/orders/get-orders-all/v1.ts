/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";

import { edb } from "@/common/db";
import { logger } from "@/common/logger";
import {
  base64Regex,
  buildContinuation,
  formatEth,
  fromBuffer,
  splitContinuation,
  toBuffer,
} from "@/common/utils";
import { Sources } from "@/models/sources";

const version = "v1";

export const getOrdersAllV1Options: RouteOptions = {
  description: "Bulk access to raw orders",
  notes:
    "This API is designed for efficiently ingesting large volumes of orders, for external processing",
  tags: ["api", "1. Order Book"],
  plugins: {
    "hapi-swagger": {
      order: 1,
    },
  },
  validate: {
    query: Joi.object({
      contract: Joi.string()
        .lowercase()
        .pattern(/^0x[a-fA-F0-9]{40}$/),
      source: Joi.string(),
      side: Joi.string().valid("sell", "buy").default("sell"),
      includeMetadata: Joi.boolean().default(false),
      includeRawData: Joi.boolean().default(false),
      continuation: Joi.string().pattern(base64Regex),
      limit: Joi.number().integer().min(1).max(1000).default(50),
    }).oxor("contract", "source"),
  },
  response: {
    schema: Joi.object({
      orders: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          kind: Joi.string().required(),
          side: Joi.string().valid("buy", "sell").required(),
          tokenSetId: Joi.string().required(),
          tokenSetSchemaHash: Joi.string()
            .lowercase()
            .pattern(/^0x[a-fA-F0-9]{64}$/)
            .required(),
          maker: Joi.string()
            .lowercase()
            .pattern(/^0x[a-fA-F0-9]{40}$/)
            .required(),
          taker: Joi.string()
            .lowercase()
            .pattern(/^0x[a-fA-F0-9]{40}$/)
            .required(),
          price: Joi.number().unsafe().required(),
          value: Joi.number().unsafe().required(),
          validFrom: Joi.number().required(),
          validUntil: Joi.number().required(),
          source: Joi.string().allow(null, ""),
          feeBps: Joi.number().allow(null),
          feeBreakdown: Joi.array()
            .items(
              Joi.object({
                kind: Joi.string(),
                recipient: Joi.string()
                  .lowercase()
                  .pattern(/^0x[a-fA-F0-9]{40}$/)
                  .allow(null),
                bps: Joi.number(),
              })
            )
            .allow(null),
          expiration: Joi.number().required(),
          createdAt: Joi.string().required(),
          updatedAt: Joi.string().required(),
          metadata: Joi.object().allow(null),
          rawData: Joi.object().allow(null),
        })
      ),
      continuation: Joi.string().pattern(base64Regex).allow(null),
    }).label(`getOrdersAll${version.toUpperCase()}Response`),
    failAction: (_request, _h, error) => {
      logger.error(`get-orders-all-${version}-handler`, `Wrong response schema: ${error}`);
      throw error;
    },
  },
  handler: async (request: Request) => {
    const query = request.query as any;

    try {
      const metadataBuildQuery = `
        (
          CASE
            WHEN orders.token_set_id LIKE 'token:%' THEN
              (SELECT
                json_build_object(
                  'kind', 'token',
                  'data', json_build_object(
                    'collectionName', collections.name,
                    'tokenName', tokens.name,
                    'image', tokens.image
                  )
                )
              FROM tokens
              JOIN collections
                ON tokens.collection_id = collections.id
              WHERE tokens.contract = decode(substring(split_part(orders.token_set_id, ':', 2) from 3), 'hex')
                AND tokens.token_id = (split_part(orders.token_set_id, ':', 3)::NUMERIC(78, 0)))

            WHEN orders.token_set_id LIKE 'contract:%' THEN
              (SELECT
                json_build_object(
                  'kind', 'collection',
                  'data', json_build_object(
                    'collectionName', collections.name,
                    'image', (collections.metadata ->> 'imageUrl')::TEXT
                  )
                )
              FROM collections
              WHERE collections.id = substring(orders.token_set_id from 10))

            WHEN orders.token_set_id LIKE 'range:%' THEN
              (SELECT
                json_build_object(
                  'kind', 'collection',
                  'data', json_build_object(
                    'collectionName', collections.name,
                    'image', (collections.metadata ->> 'imageUrl')::TEXT
                  )
                )
              FROM collections
              WHERE collections.id = substring(orders.token_set_id from 7))

            WHEN orders.token_set_id LIKE 'list:%' THEN
              (SELECT
                json_build_object(
                  'kind', 'attribute',
                  'data', json_build_object(
                    'collectionName', collections.name,
                    'attributes', ARRAY[json_build_object('key', attribute_keys.key, 'value', attributes.value)],
                    'image', (collections.metadata ->> 'imageUrl')::TEXT
                  )
                )
              FROM token_sets
              JOIN attributes
                ON token_sets.attribute_id = attributes.id
              JOIN attribute_keys
                ON attributes.attribute_key_id = attribute_keys.id
              JOIN collections
                ON attribute_keys.collection_id = collections.id
              WHERE token_sets.id = orders.token_set_id)

            ELSE NULL
          END
        ) AS metadata
      `;

      let baseQuery = `
        SELECT
          orders.id,
          orders.kind,
          orders.side,
          orders.token_set_id,
          orders.token_set_schema_hash,
          orders.maker,
          orders.taker,
          orders.price,
          orders.value,
          DATE_PART('epoch', LOWER(orders.valid_between)) AS valid_from,
          COALESCE(
            NULLIF(DATE_PART('epoch', UPPER(orders.valid_between)), 'Infinity'),
            0
          ) AS valid_until,
          orders.source_id,
          orders.fee_bps,
          orders.fee_breakdown,
          COALESCE(
            NULLIF(DATE_PART('epoch', orders.expiration), 'Infinity'),
            0
          ) AS expiration,
          extract(epoch from orders.created_at) AS created_at,
          ${query.includeRawData ? `orders.raw_data,` : ""}
          ${query.includeMetadata ? `${metadataBuildQuery},` : ""}
          orders.updated_at
        FROM orders
      `;

      // Filters
      const conditions: string[] = [`orders.contract IS NOT NULL`, `orders.side = $/side/`];
      if (query.contract) {
        (query as any).contract = toBuffer(query.contract);
        conditions.push(`orders.contract = $/contract/`);
      }

      if (query.source) {
        const sources = await Sources.getInstance();
        const source = sources.getByName(query.source);
        (query as any).sourceAddress = toBuffer(source.address);
        conditions.push(`coalesce(orders.source_id, '\\x00'::BYTEA) = $/sourceAddress/`);
      }

      if (query.continuation) {
        const [createdAt, id] = splitContinuation(
          query.continuation,
          /^\d+(.\d+)?_0x[a-f0-9]{64}$/
        );
        (query as any).createdAt = createdAt;
        (query as any).id = id;

        conditions.push(`(orders.created_at, orders.id) < (to_timestamp($/createdAt/), $/id/)`);
      }

      if (conditions.length) {
        baseQuery += " WHERE " + conditions.map((c) => `(${c})`).join(" AND ");
      }

      // Sorting
      baseQuery += ` ORDER BY orders.created_at DESC, orders.id DESC`;

      // Pagination
      baseQuery += ` LIMIT $/limit/`;

      const rawResult = await edb.manyOrNone(baseQuery, query);

      let continuation = null;
      if (rawResult.length === query.limit) {
        continuation = buildContinuation(
          rawResult[rawResult.length - 1].created_at + "_" + rawResult[rawResult.length - 1].id
        );
      }

      const sources = await Sources.getInstance();
      const result = rawResult.map((r) => ({
        id: r.id,
        kind: r.kind,
        side: r.side,
        tokenSetId: r.token_set_id,
        tokenSetSchemaHash: fromBuffer(r.token_set_schema_hash),
        maker: fromBuffer(r.maker),
        taker: fromBuffer(r.taker),
        price: formatEth(r.price),
        // For consistency, we set the value of "sell" orders as price - fee
        value:
          r.side === "buy"
            ? formatEth(r.value)
            : formatEth(r.value) - (formatEth(r.value) * Number(r.fee_bps)) / 10000,
        validFrom: Number(r.valid_from),
        validUntil: Number(r.valid_until),
        source: r.source_id ? sources.getByAddress(fromBuffer(r.source_id))?.name : null,
        feeBps: Number(r.fee_bps),
        feeBreakdown: r.fee_breakdown,
        expiration: Number(r.expiration),
        createdAt: new Date(r.created_at * 1000).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
        rawData: r.raw_data ?? undefined,
        metadata: r.metadata ?? undefined,
      }));

      return {
        orders: result,
        continuation,
      };
    } catch (error) {
      logger.error(`get-orders-all-${version}-handler`, `Handler failure: ${error}`);
      throw error;
    }
  },
};

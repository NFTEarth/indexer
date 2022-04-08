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
import { SourcesEntity } from "@/models/sources/sources-entity";

const version = "v1";

export const getOrdersAsksV1Options: RouteOptions = {
  description: "Get a list of asks (listings), filtered by token, collection or maker",
  notes:
    "This API is designed for efficiently ingesting large volumes of orders, for external processing",
  tags: ["api", "4. NFT API"],
  plugins: {
    "hapi-swagger": {
      order: 41,
    },
  },
  validate: {
    query: Joi.object({
      token: Joi.string()
        .lowercase()
        .pattern(/^0x[a-fA-F0-9]{40}:\d+$/)
        .description("Filter to a token, e.g. `0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63:123`"),
      tokenSetId: Joi.string()
        .lowercase()
        .description(
          "Filter to a particular set, e.g. `contract:0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63`"
        ),
      maker: Joi.string()
        .lowercase()
        .pattern(/^0x[a-fA-F0-9]{40}$/)
        .description(
          "Filter to a particular user, e.g. `0x4d04eb67a2d1e01c71fad0366e0c200207a75487`"
        ),
      status: Joi.string()
        .valid("active", "inactive", "expired")
        .description(
          "`active` = currently valid, `inactive` = temporarily invalid, `expired` = permanently invalid\n\nAvailable when filtering by maker, otherwise only valid orders will be returned"
        ),
      continuation: Joi.string().pattern(base64Regex),
      limit: Joi.number().integer().min(1).max(1000).default(50),
    })
      .or("token", "tokenSetId", "maker")
      .oxor("token", "tokenSetId", "maker")
      .with("status", "maker"),
  },
  response: {
    schema: Joi.object({
      orders: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          kind: Joi.string().required(),
          side: Joi.string().valid("buy", "sell").required(),
          fillabilityStatus: Joi.string().required(),
          approvalStatus: Joi.string().required(),
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
          metadata: Joi.alternatives(
            Joi.object({
              kind: "token",
              data: Joi.object({
                collectionName: Joi.string().allow("", null),
                tokenName: Joi.string().allow("", null),
                image: Joi.string().allow("", null),
              }),
            }),
            Joi.object({
              kind: "collection",
              data: Joi.object({
                collectionName: Joi.string().allow("", null),
                image: Joi.string().allow("", null),
              }),
            }),
            Joi.object({
              kind: "attribute",
              data: Joi.object({
                collectionName: Joi.string().allow("", null),
                attributes: Joi.array().items(
                  Joi.object({ key: Joi.string(), value: Joi.string() })
                ),
                image: Joi.string().allow("", null),
              }),
            })
          ).allow(null),
          source: Joi.object().allow(null),
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
          rawData: Joi.object(),
        })
      ),
      continuation: Joi.string().pattern(base64Regex).allow(null),
    }).label(`getOrdersAsks${version.toUpperCase()}Response`),
    failAction: (_request, _h, error) => {
      logger.error(`get-orders-asks-${version}-handler`, `Wrong response schema: ${error}`);
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
          orders.fillability_status,
          orders.approval_status,
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
          orders.updated_at,
          orders.raw_data,
          ${metadataBuildQuery}
        FROM orders
      `;

      // Filters
      const conditions: string[] = [`orders.side = 'sell'`];
      if (query.token || query.tokenSetId) {
        // Valid orders
        conditions.push(
          `orders.fillability_status = 'fillable' AND orders.approval_status = 'approved'`
        );

        if (query.token) {
          (query as any).tokenSetId = `token:${query.token}`;
        }
        conditions.push(`orders.token_set_id = $/tokenSetId/`);
      }
      if (query.maker) {
        switch (query.status) {
          case "inactive": {
            // Potentially-valid orders
            conditions.push(
              `orders.fillability_status = 'no-balance' OR (orders.fillability_status = 'fillable' AND orders.approval_status != 'approved')`
            );
            break;
          }

          case "expired": {
            // Invalid orders
            conditions.push(
              `orders.fillability_status != 'fillable' AND orders.fillability_status != 'no-balance'`
            );
            break;
          }

          case "active":
          default: {
            // Valid orders
            conditions.push(
              `orders.fillability_status = 'fillable' AND orders.approval_status = 'approved'`
            );

            break;
          }
        }

        (query as any).maker = toBuffer(query.maker);
        conditions.push(`orders.maker = $/maker/`);
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

      const result = rawResult.map(async (r) => {
        const sources = await Sources.getInstance();
        let source: SourcesEntity | undefined;
        if (r.source_id) {
          let contract: string | undefined;
          let tokenId: string | undefined;
          if (r.token_set_id?.startsWith("token:")) {
            [contract, tokenId] = r.token_set_id.split(":").slice(1);
          }
          source = sources.get(fromBuffer(r.source_id), contract, tokenId);
        }

        return {
          id: r.id,
          kind: r.kind,
          side: r.side,
          fillabilityStatus: r.fillability_status,
          approvalStatus: r.approval_status,
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
          metadata: r.metadata,
          source: {
            id: source?.metadata.id,
            name: source?.metadata.name,
            icon: source?.metadata.icon,
            url: source?.metadata.url,
          },
          feeBps: Number(r.fee_bps),
          feeBreakdown: r.fee_breakdown,
          expiration: Number(r.expiration),
          createdAt: new Date(r.created_at * 1000).toISOString(),
          updatedAt: new Date(r.updated_at).toISOString(),
          rawData: r.raw_data,
        };
      });

      return {
        orders: await Promise.all(result),
        continuation,
      };
    } catch (error) {
      logger.error(`get-orders-asks-${version}-handler`, `Handler failure: ${error}`);
      throw error;
    }
  },
};

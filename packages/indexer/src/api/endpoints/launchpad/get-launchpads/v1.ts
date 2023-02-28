/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, RouteOptions } from "@hapi/hapi";
import _ from "lodash";
import Joi from "joi";

import { redb } from "@/common/db";
import { logger } from "@/common/logger";
import { buildContinuation, regex, splitContinuation, toBuffer } from "@/common/utils";
import { ApiKeyManager } from "@/models/api-keys";
import * as Boom from "@hapi/boom";

const version = "v1";

export const getLaunchpadsV1Options: RouteOptions = {
  cache: {
    privacy: "public",
    expiresIn: 10000,
  },
  description: "Launchpads",
  notes:
    "Useful for getting multiple launchpads to show in a marketplace, or search for particular creator.",
  tags: ["api", "Launchpad"],
  plugins: {
    "hapi-swagger": {
      order: 2,
    },
  },
  validate: {
    headers: Joi.object({
      "x-api-key": Joi.string(),
    }).options({ allowUnknown: true }),
    query: Joi.object({
      id: Joi.string()
        .lowercase()
        .description(
          "Filter to a particular collection with collection id. Example: `0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63`"
        ),
      slug: Joi.string()
        .lowercase()
        .description(
          "Filter to a particular collection with collection id. Example: `0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63`"
        ),
      contract: Joi.alternatives()
        .try(
          Joi.array().items(Joi.string().lowercase().pattern(regex.address)).max(20),
          Joi.string().lowercase().pattern(regex.address)
        )
        .description("Array of contracts. Example: `0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63`"),
      creator: Joi.string()
        .lowercase()
        .description(
          "Filter to a particular collection with creator id. Example: `0x8d04a8c79ceb0889bdd12acdf3fa9d207ed3ff63`"
        ),
      includeAllowList: Joi.boolean()
        .default(false)
        .description("If true, allowlist will be returned in the response."),
      limit: Joi.number()
        .integer()
        .min(1)
        .max(20)
        .default(20)
        .description("Amount of items returned in response."),
      continuation: Joi.string().description(
        "Use continuation token to request next offset of items."
      ),
    }).oxor("id", "slug", "creator", "contract"),
  },
  response: {
    schema: Joi.object({
      continuation: Joi.string().allow(null),
      launchpads: Joi.array().items(
        Joi.object({
          id: Joi.string(),
          constructor_args: Joi.string().required(),
          deployer: Joi.string().pattern(regex.address).required(),
          createdAt: Joi.string(),
          name: Joi.string().allow("", null),
          image: Joi.string().allow("", null),
          banner: Joi.string().allow("", null),
          discordUrl: Joi.string().allow("", null),
          externalUrl: Joi.string().allow("", null),
          twitterUsername: Joi.string().allow("", null),
          description: Joi.string().allow("", null),
          tokenCount: Joi.string(),
          allowlists: Joi.array().items(Joi.string().pattern(regex.address)).allow(null),
          royalties: Joi.object({
            recipient: Joi.string().allow("", null),
            breakdown: Joi.array().items(
              Joi.object({
                recipient: Joi.string().pattern(regex.address),
                bps: Joi.number(),
              })
            ),
            bps: Joi.number(),
          }).allow(null),
          allRoyalties: Joi.object().allow(null),
        })
      ),
    }).label(`getLaunchpads${version.toUpperCase()}Response`),
    failAction: (_request, _h, error) => {
      logger.error(`get-launchpads-${version}-handler`, `Wrong response schema: ${error}`);
      throw error;
    },
  },
  handler: async (request: Request) => {
    const query = request.query as any;
    const apiKey = await ApiKeyManager.getApiKey(request.headers["x-api-key"]);

    if (_.isNull(apiKey)) {
      throw Boom.unauthorized("Invalid API key");
    }

    if (!apiKey.permissions?.override_collection_refresh_cool_down) {
      throw Boom.unauthorized("Not allowed");
    }

    let selectAllowList = ``;
    if (query.includeAllowList) {
      selectAllowList = `launchpad_contract.allowlists,`;
    }

    try {
      let baseQuery = `
        SELECT
          launchpad_contract.id,
          launchpad_contract.constructor_args,
          launchpad_contract.deployer,
          ${selectAllowList}         
          collections.name,
          collections.slug,
          (collections.metadata ->> 'imageUrl')::TEXT AS "image",
          (collections.metadata ->> 'bannerImageUrl')::TEXT AS "banner",
          (collections.metadata ->> 'discordUrl')::TEXT AS "discord_url",
          (collections.metadata ->> 'description')::TEXT AS "description",
          (collections.metadata ->> 'externalUrl')::TEXT AS "external_url",
          (collections.metadata ->> 'twitterUsername')::TEXT AS "twitter_username",
          (collections.metadata ->> 'safelistRequestStatus')::TEXT AS "opensea_verification_status",
          collections.royalties,
          collections.new_royalties,
          collections.contract,
          collections.created_at
        FROM launchpad_contract LEFT JOIN collections
            ON collections.id = launchpad_contract.id
      `;

      const conditions: string[] = [];

      if (query.id) {
        conditions.push("collections.id = $/id/");
      }
      if (query.slug) {
        conditions.push("collections.slug = $/slug/");
      }
      if (query.contract) {
        if (!Array.isArray(query.contract)) {
          query.contract = [query.contract];
        }
        query.contract = query.contract.map((contract: string) => toBuffer(contract));
        conditions.push(`collections.contract IN ($/contract:csv/)`);
      }
      if (query.creator) {
        query.creator = toBuffer(query.creator);
        conditions.push(`launchpad_contract.deployer = $/creator/`);
      }

      // Sorting and pagination
      if (query.continuation) {
        const [contParam, contId] = _.split(splitContinuation(query.continuation)[0], "_");
        query.contParam = contParam;
        query.contId = contId;
        conditions.push(`(collections.created_at, collections.id) < ($/contParam/, $/contId/)`);
      }

      if (conditions.length) {
        baseQuery += " WHERE " + conditions.map((c) => `(${c})`).join(" AND ");
      }

      baseQuery += ` ORDER BY collections.created_at DESC, collections.id DESC`;
      baseQuery += ` LIMIT $/limit/`;

      const results = await redb.manyOrNone(baseQuery, query);

      const launchpads = await Promise.all(
        results.map(async (r) => {
          return {
            id: r.id,
            slug: r.slug,
            createdAt: new Date(r.created_at).toISOString(),
            name: r.name,
            image: r.image ? r.image : null,
            banner: r.banner,
            discordUrl: r.discord_url,
            externalUrl: r.external_url,
            twitterUsername: r.twitter_username,
            description: r.description,
            allowlists: r.allowlists ? r.allowlists : null,
            royalties: r.royalties
              ? {
                  // Main recipient, kept for backwards-compatibility only
                  recipient: r.royalties.length ? r.royalties[0].recipient : null,
                  breakdown: r.royalties.filter((r: any) => r.bps && r.recipient),
                  bps: r.royalties
                    .map((r: any) => r.bps)
                    .reduce((a: number, b: number) => a + b, 0),
                }
              : null,
            allRoyalties: r.new_royalties ?? null,
          };
        })
      );

      // Pagination
      const lastCollection = _.last(results);
      let continuation: string | null = null;

      if (lastCollection) {
        continuation = buildContinuation(
          `${new Date(lastCollection.created_at).toISOString()}_${lastCollection.id}`
        );
      }

      return {
        launchpads,
        continuation: continuation ? continuation : undefined,
      };
    } catch (error) {
      logger.error(`get-launchpads-${version}-handler`, `Handler failure: ${error}`);
      throw error;
    }
  },
};

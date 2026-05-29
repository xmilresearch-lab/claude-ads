import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResponse } from "../lib/errors.js";
import { paginate } from "../lib/pagination.js";

const TWITTER_API = "https://api.twitter.com/2";

function accessToken(): string {
  return process.env["TWITTER_ACCESS_TOKEN"] ?? "";
}
function bearerToken(): string {
  return process.env["TWITTER_BEARER_TOKEN"] ?? "";
}
function userId(): string {
  return process.env["TWITTER_USER_ID"] ?? "";
}

function notConfigured(): ReturnType<typeof errorResponse> {
  return errorResponse(
    "TWITTER_NOT_CONFIGURED",
    "Twitter credentials are not configured",
    "Set TWITTER_ACCESS_TOKEN, TWITTER_BEARER_TOKEN, and TWITTER_USER_ID"
  );
}

export function registerTwitterTools(server: McpServer): void {
  server.tool(
    "twitter_create_tweet",
    "Post a new tweet. readOnlyHint=false destructiveHint=false idempotentHint=false",
    {
      text: z.string().min(1).max(280).describe("Tweet text (max 280 chars)"),
      reply_to_id: z
        .string()
        .optional()
        .describe("Tweet ID to reply to"),
      media_ids: z
        .array(z.string())
        .max(4)
        .optional()
        .describe("Uploaded media IDs to attach (max 4)"),
    },
    async (args) => {
      if (!accessToken()) return notConfigured();
      try {
        const body: Record<string, unknown> = { text: args.text };
        if (args.reply_to_id) {
          body["reply"] = { in_reply_to_tweet_id: args.reply_to_id };
        }
        if (args.media_ids?.length) {
          body["media"] = { media_ids: args.media_ids };
        }
        const res = await fetch(`${TWITTER_API}/tweets`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as {
            detail?: string;
          };
          return errorResponse(
            "TWITTER_CREATE_FAILED",
            `Twitter API error ${res.status}`,
            err.detail ?? "Check OAuth2 token and tweet content"
          );
        }
        const data = (await res.json()) as {
          data: { id: string; text: string };
        };
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                tweet_id: data.data.id,
                text: data.data.text,
                url: `https://twitter.com/i/web/status/${data.data.id}`,
              }),
            },
          ],
        };
      } catch {
        return errorResponse(
          "TWITTER_NETWORK_ERROR",
          "Failed to reach Twitter API",
          "Check network connectivity"
        );
      }
    }
  );

  server.tool(
    "twitter_list_tweets",
    "List recent tweets from the authenticated user's timeline. readOnlyHint=true destructiveHint=false idempotentHint=true",
    {
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
      exclude: z
        .array(z.enum(["retweets", "replies"]))
        .optional()
        .describe("Types to exclude"),
    },
    async (args) => {
      if (!bearerToken() || !userId()) return notConfigured();
      try {
        const params = new URLSearchParams({
          max_results: String(Math.min(args.limit, 100)),
          "tweet.fields": "created_at,public_metrics,entities",
          ...(args.exclude ? { exclude: args.exclude.join(",") } : {}),
        });
        const res = await fetch(
          `${TWITTER_API}/users/${userId()}/tweets?${params}`,
          { headers: { Authorization: `Bearer ${bearerToken()}` } }
        );
        if (!res.ok) {
          return errorResponse(
            "TWITTER_LIST_FAILED",
            `Twitter API error ${res.status}`,
            "Check bearer token and user ID"
          );
        }
        const data = (await res.json()) as {
          data?: unknown[];
          meta?: { result_count: number; next_token?: string };
        };
        const items = data.data ?? [];
        const total = data.meta?.result_count ?? items.length;
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(paginate(items, args.offset, args.limit, total)),
            },
          ],
        };
      } catch {
        return errorResponse(
          "TWITTER_NETWORK_ERROR",
          "Failed to reach Twitter API",
          "Check network connectivity"
        );
      }
    }
  );
}

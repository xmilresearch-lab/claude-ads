import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResponse } from "../lib/errors.js";
import { paginate } from "../lib/pagination.js";

const IG_API = "https://graph.facebook.com/v19.0";

function accessToken(): string {
  return process.env["INSTAGRAM_ACCESS_TOKEN"] ?? "";
}
function accountId(): string {
  return process.env["INSTAGRAM_ACCOUNT_ID"] ?? "";
}

function notConfigured(): ReturnType<typeof errorResponse> {
  return errorResponse(
    "INSTAGRAM_NOT_CONFIGURED",
    "Instagram credentials are not configured",
    "Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_ACCOUNT_ID"
  );
}

export function registerInstagramTools(server: McpServer): void {
  server.tool(
    "instagram_create_post",
    "Publish a photo or reel to an Instagram Business account (two-step: create container then publish). readOnlyHint=false destructiveHint=false idempotentHint=false",
    {
      image_url: z
        .string()
        .url()
        .optional()
        .describe("Public URL of the image to post"),
      video_url: z
        .string()
        .url()
        .optional()
        .describe("Public URL of the video/reel to post"),
      caption: z.string().max(2200).optional().describe("Post caption"),
      media_type: z
        .enum(["IMAGE", "REELS"])
        .default("IMAGE")
        .describe("Media type"),
    },
    async (args) => {
      if (!accessToken() || !accountId()) return notConfigured();
      if (!args.image_url && !args.video_url) {
        return errorResponse(
          "INSTAGRAM_MISSING_MEDIA",
          "Either image_url or video_url is required",
          "Provide a publicly accessible media URL"
        );
      }
      try {
        // Step 1: create media container
        const containerParams: Record<string, string> = {
          access_token: accessToken(),
          media_type: args.media_type,
          ...(args.caption ? { caption: args.caption } : {}),
          ...(args.image_url ? { image_url: args.image_url } : {}),
          ...(args.video_url ? { video_url: args.video_url } : {}),
        };
        const containerRes = await fetch(
          `${IG_API}/${accountId()}/media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(containerParams),
          }
        );
        if (!containerRes.ok) {
          const err = (await containerRes.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          return errorResponse(
            "INSTAGRAM_CONTAINER_FAILED",
            `Instagram API error ${containerRes.status}`,
            err.error?.message ?? "Check media URL is publicly accessible"
          );
        }
        const { id: containerId } = (await containerRes.json()) as {
          id: string;
        };

        // Step 2: publish the container
        const publishRes = await fetch(
          `${IG_API}/${accountId()}/media_publish`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              creation_id: containerId,
              access_token: accessToken(),
            }),
          }
        );
        if (!publishRes.ok) {
          const err = (await publishRes.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          return errorResponse(
            "INSTAGRAM_PUBLISH_FAILED",
            `Instagram publish error ${publishRes.status}`,
            err.error?.message ?? "Container created but publish failed"
          );
        }
        const { id: mediaId } = (await publishRes.json()) as { id: string };
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                media_id: mediaId,
                status: "published",
                permalink: `https://www.instagram.com/p/${mediaId}/`,
              }),
            },
          ],
        };
      } catch {
        return errorResponse(
          "INSTAGRAM_NETWORK_ERROR",
          "Failed to reach Instagram Graph API",
          "Check network connectivity"
        );
      }
    }
  );

  server.tool(
    "instagram_get_media",
    "List recent media posts from an Instagram Business account. readOnlyHint=true destructiveHint=false idempotentHint=true",
    {
      limit: z.number().int().min(1).max(50).default(20),
      offset: z.number().int().min(0).default(0),
      fields: z
        .string()
        .optional()
        .default("id,caption,media_type,timestamp,permalink,like_count,comments_count")
        .describe("Comma-separated fields to return"),
    },
    async (args) => {
      if (!accessToken() || !accountId()) return notConfigured();
      try {
        const params = new URLSearchParams({
          access_token: accessToken(),
          fields: args.fields ?? "id,caption,media_type,timestamp,permalink",
          limit: String(args.limit),
        });
        const res = await fetch(
          `${IG_API}/${accountId()}/media?${params}`
        );
        if (!res.ok) {
          return errorResponse(
            "INSTAGRAM_LIST_FAILED",
            `Instagram API error ${res.status}`,
            "Check access token and account ID"
          );
        }
        const data = (await res.json()) as {
          data?: unknown[];
          paging?: { cursors?: { after?: string }; next?: string };
        };
        const items = data.data ?? [];
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                paginate(items, args.offset, args.limit, items.length)
              ),
            },
          ],
        };
      } catch {
        return errorResponse(
          "INSTAGRAM_NETWORK_ERROR",
          "Failed to reach Instagram Graph API",
          "Check network connectivity"
        );
      }
    }
  );
}

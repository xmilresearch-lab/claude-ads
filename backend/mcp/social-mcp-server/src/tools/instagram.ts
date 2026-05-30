import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResponse } from "../lib/errors.js";
import { paginate } from "../lib/pagination.js";
import { getProviderToken } from "../lib/tokens.js";
import { createFacebookClient } from "../clients/facebook.js";

const IG_API = "https://graph.facebook.com/v19.0";

function legacyToken(): string {
  return process.env["INSTAGRAM_ACCESS_TOKEN"] ?? "";
}
function legacyAccountId(): string {
  return process.env["INSTAGRAM_ACCOUNT_ID"] ?? "";
}

function notConfigured(): ReturnType<typeof errorResponse> {
  return errorResponse(
    "INSTAGRAM_NOT_CONFIGURED",
    "Instagram credentials are not configured",
    "Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_ACCOUNT_ID"
  );
}

// Helper: resolve IG Business account ID and page access token from workspace
async function resolveIgAccount(
  workspaceId: string
): Promise<{ igUserId: string; pageAccessToken: string }> {
  const token = await getProviderToken("facebook", workspaceId);
  const client = createFacebookClient(token);
  const pages = await client.getPages();
  const page = pages.find((p) => p.instagram_business_account);
  if (!page?.instagram_business_account) {
    throw new Error(
      "No Instagram Business account linked. Connect a Facebook Page with an linked Instagram account at /integrations."
    );
  }
  return {
    igUserId: page.instagram_business_account.id,
    pageAccessToken: page.access_token,
  };
}

export function registerInstagramTools(server: McpServer): void {
  // ── instagram_create_post (workspace_id-aware, via Facebook Graph API) ───
  server.tool(
    "instagram_create_post",
    "Publish an image post to an Instagram Business account (two-step container → publish). readOnlyHint=false destructiveHint=false idempotentHint=false",
    {
      workspace_id: z
        .string()
        .optional()
        .describe(
          "Workspace identifier (uses env vars INSTAGRAM_ACCESS_TOKEN/ACCOUNT_ID if omitted)"
        ),
      image_url: z.string().url().describe("Publicly accessible URL of the image to post"),
      caption: z.string().max(2200).optional().describe("Post caption"),
      location_id: z
        .string()
        .optional()
        .describe("Facebook location page ID to tag"),
    },
    async (args) => {
      try {
        if (args.workspace_id) {
          const { igUserId, pageAccessToken } = await resolveIgAccount(
            args.workspace_id
          );
          const fbClient = createFacebookClient(pageAccessToken);
          const result = await fbClient.createInstagramPost({
            igUserId,
            pageAccessToken,
            imageUrl: args.image_url,
            caption: args.caption,
            locationId: args.location_id,
          });
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  media_id: result.id,
                  permalink: result.permalink,
                  status: "published",
                }),
              },
            ],
          };
        }

        // Legacy env-var path (backward compat)
        if (!legacyToken() || !legacyAccountId()) return notConfigured();

        const containerParams: Record<string, string> = {
          access_token: legacyToken(),
          media_type: "IMAGE",
          image_url: args.image_url,
          ...(args.caption ? { caption: args.caption } : {}),
        };
        const containerRes = await fetch(`${IG_API}/${legacyAccountId()}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(containerParams),
        });
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
        const { id: containerId } = (await containerRes.json()) as { id: string };
        const publishRes = await fetch(`${IG_API}/${legacyAccountId()}/media_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: containerId,
            access_token: legacyToken(),
          }),
        });
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
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResponse("INSTAGRAM_CREATE_FAILED", msg, "Check credentials and image URL");
      }
    }
  );

  // ── instagram_create_reel ─────────────────────────────────────
  server.tool(
    "instagram_create_reel",
    "Upload and publish a video reel to an Instagram Business account. Polls container status every 5s (up to 2 minutes). readOnlyHint=false destructiveHint=false idempotentHint=false",
    {
      workspace_id: z.string().describe("Workspace identifier"),
      video_url: z
        .string()
        .url()
        .describe("Publicly accessible MP4 video URL (max 60s via API)"),
      caption: z.string().max(2200).optional().describe("Reel caption"),
      share_to_feed: z
        .boolean()
        .optional()
        .describe("Also share reel to the main feed grid"),
    },
    async (args) => {
      try {
        const { igUserId, pageAccessToken } = await resolveIgAccount(
          args.workspace_id
        );
        const fbClient = createFacebookClient(pageAccessToken);
        const result = await fbClient.createInstagramReel({
          igUserId,
          pageAccessToken,
          videoUrl: args.video_url,
          caption: args.caption,
          shareToFeed: args.share_to_feed,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                media_id: result.id,
                permalink: result.permalink,
                status: "published",
              }),
            },
          ],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResponse(
          "INSTAGRAM_REEL_FAILED",
          msg,
          "Check video URL is publicly accessible MP4 and account has Reels access"
        );
      }
    }
  );

  // ── instagram_get_media_insights ──────────────────────────────
  server.tool(
    "instagram_get_media_insights",
    "Get views, reach, likes, comments, and saves for a specific Instagram post. readOnlyHint=true destructiveHint=false idempotentHint=true",
    {
      workspace_id: z.string().describe("Workspace identifier"),
      media_id: z.string().describe("Instagram media ID"),
      metrics: z
        .array(z.string())
        .optional()
        .describe(
          "Metrics to fetch; defaults to impressions, reach, likes, comments, shares, saved"
        ),
    },
    async (args) => {
      try {
        const { pageAccessToken } = await resolveIgAccount(args.workspace_id);
        const fbClient = createFacebookClient(pageAccessToken);
        const defaultMetrics = [
          "impressions",
          "reach",
          "likes",
          "comments",
          "shares",
          "saved",
        ];
        const insights = await fbClient.getInstagramInsights({
          mediaId: args.media_id,
          pageAccessToken,
          metric: args.metrics ?? defaultMetrics,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                media_id: args.media_id,
                metrics: insights.map((m) => ({
                  name: m.id.split("/").pop(),
                  value: m.values[0]?.value ?? 0,
                })),
              }),
            },
          ],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResponse(
          "INSTAGRAM_INSIGHTS_FAILED",
          msg,
          "Check media ID and ensure the post belongs to this account"
        );
      }
    }
  );

  // ── instagram_get_media (legacy read tool, kept for backward compat) ───
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
      if (!legacyToken() || !legacyAccountId()) return notConfigured();
      try {
        const params = new URLSearchParams({
          access_token: legacyToken(),
          fields: args.fields ?? "id,caption,media_type,timestamp,permalink",
          limit: String(args.limit),
        });
        const res = await fetch(`${IG_API}/${legacyAccountId()}/media?${params}`);
        if (!res.ok) {
          return errorResponse(
            "INSTAGRAM_LIST_FAILED",
            `Instagram API error ${res.status}`,
            "Check access token and account ID"
          );
        }
        const data = (await res.json()) as {
          data?: unknown[];
        };
        const items = data.data ?? [];
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(paginate(items, args.offset, args.limit, items.length)),
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

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResponse } from "../lib/errors.js";
import { getProviderToken } from "../lib/tokens.js";
import { createTikTokClient } from "../clients/tiktok.js";

export function registerTikTokTools(server: McpServer): void {
  // ── tiktok_publish_video ──────────────────────────────────────
  server.tool(
    "tiktok_publish_video",
    "Publish a video to TikTok by URL. Polls publish status every 10s (up to 5 minutes). readOnlyHint=false destructiveHint=false idempotentHint=false",
    {
      workspace_id: z.string().describe("Workspace identifier"),
      video_url: z
        .string()
        .url()
        .describe("Publicly accessible MP4 video URL"),
      title: z
        .string()
        .min(1)
        .max(2200)
        .describe("Video title / caption (max 2,200 chars)"),
      privacy_level: z
        .enum(["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"])
        .optional()
        .describe("Visibility — defaults to PUBLIC_TO_EVERYONE"),
      disable_comment: z.boolean().optional().describe("Disable comments on the video"),
      disable_duet: z.boolean().optional().describe("Disable Duet feature"),
      disable_stitch: z.boolean().optional().describe("Disable Stitch feature"),
      video_cover_timestamp_ms: z
        .number()
        .int()
        .optional()
        .describe("Millisecond offset for the cover thumbnail frame"),
    },
    async (args) => {
      try {
        const token = await getProviderToken("tiktok", args.workspace_id);
        const client = createTikTokClient(token);
        const result = await client.publishVideoFromUrl({
          videoUrl: args.video_url,
          title: args.title,
          privacyLevel: args.privacy_level,
          disableComment: args.disable_comment,
          disableDuet: args.disable_duet,
          disableStitch: args.disable_stitch,
          videoCoverTimestampMs: args.video_cover_timestamp_ms,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                publish_id: result.publish_id,
                share_url: result.share_url,
                status: "published",
              }),
            },
          ],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResponse(
          "TIKTOK_PUBLISH_FAILED",
          msg,
          "Ensure video URL is a publicly accessible MP4 and TikTok token has video.publish scope"
        );
      }
    }
  );

  // ── tiktok_get_videos ─────────────────────────────────────────
  server.tool(
    "tiktok_get_videos",
    "List videos posted to a TikTok account with cursor-based pagination. readOnlyHint=true destructiveHint=false idempotentHint=true",
    {
      workspace_id: z.string().describe("Workspace identifier"),
      max_count: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(10)
        .describe("Number of videos to return (max 20)"),
      cursor: z
        .number()
        .int()
        .optional()
        .describe("Pagination cursor from the previous response"),
    },
    async (args) => {
      try {
        const token = await getProviderToken("tiktok", args.workspace_id);
        const client = createTikTokClient(token);
        const result = await client.getVideos({
          max_count: args.max_count,
          cursor: args.cursor,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                videos: result.videos,
                cursor: result.cursor,
                has_more: result.has_more,
                total_count: result.videos.length,
              }),
            },
          ],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResponse(
          "TIKTOK_GET_VIDEOS_FAILED",
          msg,
          "Check TikTok token has video.list scope"
        );
      }
    }
  );

  // ── tiktok_get_video_analytics ────────────────────────────────
  server.tool(
    "tiktok_get_video_analytics",
    "Get likes, comments, shares, and views for a specific TikTok video. readOnlyHint=true destructiveHint=false idempotentHint=true",
    {
      workspace_id: z.string().describe("Workspace identifier"),
      video_id: z.string().describe("TikTok video ID"),
    },
    async (args) => {
      try {
        const token = await getProviderToken("tiktok", args.workspace_id);
        const client = createTikTokClient(token);
        const analytics = await client.getVideoAnalytics(args.video_id);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                video_id: analytics.id,
                like_count: analytics.like_count,
                comment_count: analytics.comment_count,
                share_count: analytics.share_count,
                view_count: analytics.view_count,
              }),
            },
          ],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResponse(
          "TIKTOK_ANALYTICS_FAILED",
          msg,
          "Check video ID belongs to this account and token has video.list scope"
        );
      }
    }
  );
}

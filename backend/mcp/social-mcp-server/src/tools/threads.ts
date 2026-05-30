import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResponse } from "../lib/errors.js";
import { getProviderToken } from "../lib/tokens.js";
import { createThreadsClient } from "../clients/threads.js";

export function registerThreadsTools(server: McpServer): void {
  // ── threads_create_post ───────────────────────────────────────
  server.tool(
    "threads_create_post",
    "Publish a text, image, or video post to Threads. Uses two-step container → publish flow. readOnlyHint=false destructiveHint=false idempotentHint=false",
    {
      workspace_id: z.string().describe("Workspace identifier"),
      text: z.string().max(500).optional().describe("Post text (max 500 chars)"),
      media_type: z
        .enum(["TEXT", "IMAGE", "VIDEO"])
        .default("TEXT")
        .describe("Post media type"),
      image_url: z
        .string()
        .url()
        .optional()
        .describe("Publicly accessible image URL (required when media_type=IMAGE)"),
      video_url: z
        .string()
        .url()
        .optional()
        .describe("Publicly accessible video URL (required when media_type=VIDEO)"),
      reply_control: z
        .enum(["everyone", "accounts_you_follow", "mentioned_only"])
        .optional()
        .describe("Who can reply to this post"),
      reply_to_id: z
        .string()
        .optional()
        .describe("Threads post ID to reply to"),
    },
    async (args) => {
      try {
        const token = await getProviderToken("threads", args.workspace_id);
        const client = createThreadsClient(token);
        const me = await client.getMe();

        let result;
        if (args.reply_to_id) {
          result = await client.replyToThread({
            userId: me.id,
            replyToId: args.reply_to_id,
            text: args.text ?? "",
            mediaType: args.media_type === "IMAGE" ? "IMAGE" : "TEXT",
            imageUrl: args.image_url,
          });
        } else {
          const container = await client.createContainer({
            userId: me.id,
            mediaType: args.media_type,
            text: args.text,
            imageUrl: args.image_url,
            videoUrl: args.video_url,
            replyControl: args.reply_control,
          });
          result = await client.publish({ userId: me.id, creationId: container.id });
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                post_id: result.id,
                permalink: result.permalink,
                status: "published",
              }),
            },
          ],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResponse(
          "THREADS_CREATE_FAILED",
          msg,
          "Check Threads token has threads_basic and threads_content_publish scopes"
        );
      }
    }
  );

  // ── threads_create_carousel ───────────────────────────────────
  server.tool(
    "threads_create_carousel",
    "Publish a carousel post (2–20 images or videos) to Threads. Creates child containers then a parent carousel container. readOnlyHint=false destructiveHint=false idempotentHint=false",
    {
      workspace_id: z.string().describe("Workspace identifier"),
      items: z
        .array(
          z.object({
            media_type: z.enum(["IMAGE", "VIDEO"]).describe("Media type for this item"),
            url: z.string().url().describe("Publicly accessible URL for this item"),
          })
        )
        .min(2)
        .max(20)
        .describe("Carousel items (2–20 images or videos)"),
      text: z.string().max(500).optional().describe("Caption for the carousel (max 500 chars)"),
      reply_control: z
        .enum(["everyone", "accounts_you_follow", "mentioned_only"])
        .optional()
        .describe("Who can reply to this post"),
    },
    async (args) => {
      try {
        const token = await getProviderToken("threads", args.workspace_id);
        const client = createThreadsClient(token);
        const me = await client.getMe();
        const result = await client.createCarouselPost({
          userId: me.id,
          items: args.items.map((item) => ({
            mediaType: item.media_type,
            url: item.url,
          })),
          text: args.text,
          replyControl: args.reply_control,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                post_id: result.id,
                permalink: result.permalink,
                status: "published",
                item_count: args.items.length,
              }),
            },
          ],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResponse(
          "THREADS_CAROUSEL_FAILED",
          msg,
          "Ensure all media URLs are publicly accessible and token has threads_content_publish scope"
        );
      }
    }
  );
}

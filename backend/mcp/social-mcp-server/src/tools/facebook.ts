import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResponse } from "../lib/errors.js";
import { getProviderToken } from "../lib/tokens.js";
import { createFacebookClient } from "../clients/facebook.js";

export function registerFacebookTools(server: McpServer): void {
  // ── facebook_get_pages ─────────────────────────────────────────
  server.tool(
    "facebook_get_pages",
    "List all Facebook Pages the connected account manages. readOnlyHint=true destructiveHint=false idempotentHint=true",
    {
      workspace_id: z.string().describe("Workspace identifier"),
    },
    async (args) => {
      try {
        const token = await getProviderToken("facebook", args.workspace_id);
        const client = createFacebookClient(token);
        const pages = await client.getPages();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                pages: pages.map((p) => ({
                  id: p.id,
                  name: p.name,
                  instagram_connected: !!p.instagram_business_account,
                  instagram_account_id: p.instagram_business_account?.id,
                })),
                total: pages.length,
              }),
            },
          ],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResponse("FACEBOOK_GET_PAGES_FAILED", msg, "Check Facebook access token");
      }
    }
  );

  // ── facebook_create_post ───────────────────────────────────────
  server.tool(
    "facebook_create_post",
    "Create a text, link, or image post on a Facebook Page. readOnlyHint=false destructiveHint=false idempotentHint=false",
    {
      workspace_id: z.string().describe("Workspace identifier"),
      page_id: z.string().optional().describe("Facebook Page ID; defaults to first managed page"),
      message: z.string().min(1).max(63_206).describe("Post text (max 63,206 chars)"),
      link: z.string().url().optional().describe("URL to attach as a link preview"),
      image_url: z.string().url().optional().describe("Public URL of an image to post"),
      published: z.boolean().default(true).describe("Publish immediately (false = draft)"),
      scheduled_unix_timestamp: z
        .number()
        .int()
        .optional()
        .describe("Unix timestamp to schedule the post (requires published=false)"),
    },
    async (args) => {
      try {
        const token = await getProviderToken("facebook", args.workspace_id);
        const client = createFacebookClient(token);

        let pageId = args.page_id;
        let pageToken: string;
        let pageName: string;

        if (!pageId) {
          const pages = await client.getPages();
          if (!pages.length) {
            return errorResponse(
              "FACEBOOK_NO_PAGES",
              "No Facebook Pages found for this account",
              "Ensure the Facebook account manages at least one Page"
            );
          }
          pageId = pages[0].id;
          pageToken = pages[0].access_token;
          pageName = pages[0].name;
        } else {
          const pages = await client.getPages();
          const page = pages.find((p) => p.id === pageId);
          if (!page) {
            return errorResponse(
              "FACEBOOK_PAGE_NOT_FOUND",
              `Page ${pageId} not found or not managed by this account`,
              "Use facebook_get_pages to list available pages"
            );
          }
          pageToken = page.access_token;
          pageName = page.name;
        }

        const result = await client.createPagePost({
          pageId,
          pageAccessToken: pageToken,
          message: args.message,
          link: args.link,
          imageUrl: args.image_url,
          published: args.published,
          scheduled_publish_time: args.scheduled_unix_timestamp,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                post_id: result.id,
                post_url: result.post_url,
                page_name: pageName,
                status: args.published ? "published" : "draft",
              }),
            },
          ],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResponse("FACEBOOK_CREATE_FAILED", msg, "Check page access token and content");
      }
    }
  );

  // ── facebook_get_page_insights ─────────────────────────────────
  server.tool(
    "facebook_get_page_insights",
    "Retrieve reach, impressions, and engagement metrics for a Facebook Page. readOnlyHint=true destructiveHint=false idempotentHint=true",
    {
      workspace_id: z.string().describe("Workspace identifier"),
      page_id: z.string().describe("Facebook Page ID"),
      period: z
        .enum(["7d", "28d"])
        .default("7d")
        .describe("Reporting window: 7 or 28 days"),
      metrics: z
        .array(z.string())
        .optional()
        .describe(
          "Metrics to fetch; defaults to page_impressions, page_reach, page_engaged_users"
        ),
    },
    async (args) => {
      try {
        const token = await getProviderToken("facebook", args.workspace_id);
        const client = createFacebookClient(token);

        const pages = await client.getPages();
        const page = pages.find((p) => p.id === args.page_id);
        if (!page) {
          return errorResponse(
            "FACEBOOK_PAGE_NOT_FOUND",
            `Page ${args.page_id} not found`,
            "Use facebook_get_pages to list available pages"
          );
        }

        const defaultMetrics = [
          "page_impressions",
          "page_reach",
          "page_engaged_users",
        ];
        const period = args.period === "28d" ? "days_28" : "week";

        const insights = await client.getPageInsights({
          pageId: args.page_id,
          pageAccessToken: page.access_token,
          metric: args.metrics ?? defaultMetrics,
          period,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                page_name: page.name,
                page_id: args.page_id,
                period: args.period,
                metrics: insights,
              }),
            },
          ],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResponse(
          "FACEBOOK_INSIGHTS_FAILED",
          msg,
          "Check page ID and token have insights permission"
        );
      }
    }
  );
}

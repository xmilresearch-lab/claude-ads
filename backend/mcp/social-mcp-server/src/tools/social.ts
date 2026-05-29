import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResponse } from "../lib/errors.js";
import { getProviderToken } from "../lib/tokens.js";
import { createFacebookClient } from "../clients/facebook.js";
import { createTikTokClient } from "../clients/tiktok.js";
import { createThreadsClient } from "../clients/threads.js";

export function registerSocialTools(server: McpServer): void {
  // ── social_create_post ────────────────────────────────────────
  // Unified routing tool called by publish_worker.py
  server.tool(
    "social_create_post",
    "Route a post to the correct social platform. Supports twitter, linkedin, facebook, instagram, tiktok, threads. readOnlyHint=false destructiveHint=false idempotentHint=false",
    {
      platform: z
        .enum(["twitter", "linkedin", "facebook", "instagram", "tiktok", "threads"])
        .describe("Target social platform"),
      workspace_id: z
        .string()
        .optional()
        .describe("Workspace identifier (required for facebook, instagram, tiktok, threads)"),
      content: z.string().min(1).describe("Post text content"),
      media_urls: z
        .array(z.string().url())
        .optional()
        .describe("Media URLs to attach (platform-dependent)"),
    },
    async (args) => {
      try {
        switch (args.platform) {
          case "twitter": {
            const accessToken = process.env["TWITTER_ACCESS_TOKEN"] ?? "";
            if (!accessToken) {
              return errorResponse(
                "TWITTER_NOT_CONFIGURED",
                "Twitter credentials are not configured",
                "Set TWITTER_ACCESS_TOKEN"
              );
            }
            const userId = process.env["TWITTER_USER_ID"] ?? "";
            const body: Record<string, unknown> = { text: args.content.slice(0, 280) };
            if (args.media_urls?.length) {
              body["media"] = { media_ids: args.media_urls };
            }
            const res = await fetch("https://api.twitter.com/2/tweets", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
            });
            if (!res.ok) {
              const err = (await res.json().catch(() => ({}))) as { detail?: string };
              return errorResponse(
                "TWITTER_POST_FAILED",
                `Twitter API error ${res.status}`,
                err.detail ?? "Check Twitter credentials"
              );
            }
            const data = (await res.json()) as { data: { id: string; text: string } };
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    platform: "twitter",
                    post_id: data.data.id,
                    status: "published",
                    url: `https://twitter.com/i/web/status/${data.data.id}`,
                  }),
                },
              ],
            };
          }

          case "linkedin": {
            const liToken = process.env["LINKEDIN_ACCESS_TOKEN"] ?? "";
            const personUrn = process.env["LINKEDIN_PERSON_URN"] ?? "";
            if (!liToken || !personUrn) {
              return errorResponse(
                "LINKEDIN_NOT_CONFIGURED",
                "LinkedIn credentials are not configured",
                "Set LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN"
              );
            }
            const liBody: Record<string, unknown> = {
              author: personUrn,
              lifecycleState: "PUBLISHED",
              specificContent: {
                "com.linkedin.ugc.ShareContent": {
                  shareCommentary: { text: args.content },
                  shareMediaCategory: "NONE",
                },
              },
              visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
            };
            const liRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${liToken}`,
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
              },
              body: JSON.stringify(liBody),
            });
            if (!liRes.ok) {
              return errorResponse(
                "LINKEDIN_POST_FAILED",
                `LinkedIn API error ${liRes.status}`,
                "Check LinkedIn access token and person URN"
              );
            }
            const liData = (await liRes.json()) as { id: string };
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    platform: "linkedin",
                    post_id: liData.id,
                    status: "published",
                  }),
                },
              ],
            };
          }

          case "facebook": {
            if (!args.workspace_id) {
              return errorResponse(
                "FACEBOOK_WORKSPACE_REQUIRED",
                "workspace_id is required for Facebook posts",
                "Provide workspace_id to look up the connected Facebook account"
              );
            }
            const fbToken = await getProviderToken("facebook", args.workspace_id);
            const fbClient = createFacebookClient(fbToken);
            const pages = await fbClient.getPages();
            if (!pages.length) {
              return errorResponse(
                "FACEBOOK_NO_PAGES",
                "No Facebook Pages found for this workspace",
                "Connect a Facebook Page at /integrations"
              );
            }
            const page = pages[0];
            const fbResult = await fbClient.createPagePost({
              pageId: page.id,
              pageAccessToken: page.access_token,
              message: args.content,
              imageUrl: args.media_urls?.[0],
            });
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    platform: "facebook",
                    post_id: fbResult.id,
                    post_url: fbResult.post_url,
                    page_name: page.name,
                    status: "published",
                  }),
                },
              ],
            };
          }

          case "instagram": {
            if (!args.workspace_id) {
              return errorResponse(
                "INSTAGRAM_WORKSPACE_REQUIRED",
                "workspace_id is required for Instagram posts",
                "Provide workspace_id to look up the connected Instagram account"
              );
            }
            const igToken = await getProviderToken("facebook", args.workspace_id);
            const igFbClient = createFacebookClient(igToken);
            const igPages = await igFbClient.getPages();
            const igPage = igPages.find((p) => p.instagram_business_account);
            if (!igPage?.instagram_business_account) {
              return errorResponse(
                "INSTAGRAM_NOT_LINKED",
                "No Instagram Business account linked to a Facebook Page",
                "Link an Instagram account to a Facebook Page at /integrations"
              );
            }
            const igResult = await igFbClient.createInstagramPost({
              igUserId: igPage.instagram_business_account.id,
              pageAccessToken: igPage.access_token,
              imageUrl: args.media_urls?.[0] ?? "",
              caption: args.content,
            });
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    platform: "instagram",
                    media_id: igResult.id,
                    permalink: igResult.permalink,
                    status: "published",
                  }),
                },
              ],
            };
          }

          case "tiktok": {
            if (!args.workspace_id) {
              return errorResponse(
                "TIKTOK_WORKSPACE_REQUIRED",
                "workspace_id is required for TikTok posts",
                "Provide workspace_id to look up the connected TikTok account"
              );
            }
            const ttToken = await getProviderToken("tiktok", args.workspace_id);
            const ttClient = createTikTokClient(ttToken);
            const videoUrl = args.media_urls?.[0];
            if (!videoUrl) {
              return errorResponse(
                "TIKTOK_VIDEO_REQUIRED",
                "TikTok posts require a video URL in media_urls",
                "Provide a publicly accessible MP4 URL in media_urls[0]"
              );
            }
            const ttResult = await ttClient.publishVideoFromUrl({
              videoUrl,
              title: args.content,
            });
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    platform: "tiktok",
                    publish_id: ttResult.publish_id,
                    share_url: ttResult.share_url,
                    status: "published",
                  }),
                },
              ],
            };
          }

          case "threads": {
            if (!args.workspace_id) {
              return errorResponse(
                "THREADS_WORKSPACE_REQUIRED",
                "workspace_id is required for Threads posts",
                "Provide workspace_id to look up the connected Threads account"
              );
            }
            const thToken = await getProviderToken("threads", args.workspace_id);
            const thClient = createThreadsClient(thToken);
            const thMe = await thClient.getMe();
            const mediaType = args.media_urls?.length ? "IMAGE" : "TEXT";
            const container = await thClient.createContainer({
              userId: thMe.id,
              mediaType,
              text: args.content,
              imageUrl: args.media_urls?.[0],
            });
            const thResult = await thClient.publish({
              userId: thMe.id,
              creationId: container.id,
            });
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    platform: "threads",
                    post_id: thResult.id,
                    permalink: thResult.permalink,
                    status: "published",
                  }),
                },
              ],
            };
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return errorResponse(
          "SOCIAL_CREATE_FAILED",
          msg,
          `Check credentials and content for ${args.platform}`
        );
      }
    }
  );
}

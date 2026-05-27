import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResponse } from "../lib/errors.js";
import { paginate } from "../lib/pagination.js";

const LINKEDIN_API = "https://api.linkedin.com/v2";

function accessToken(): string {
  return process.env["LINKEDIN_ACCESS_TOKEN"] ?? "";
}
function personUrn(): string {
  return process.env["LINKEDIN_PERSON_URN"] ?? "";
}

function notConfigured(): ReturnType<typeof errorResponse> {
  return errorResponse(
    "LINKEDIN_NOT_CONFIGURED",
    "LinkedIn credentials are not configured",
    "Set LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN"
  );
}

export function registerLinkedInTools(server: McpServer): void {
  server.tool(
    "linkedin_create_post",
    "Publish a post on LinkedIn. readOnlyHint=false destructiveHint=false idempotentHint=false",
    {
      text: z.string().min(1).max(3000).describe("Post body text"),
      visibility: z
        .enum(["PUBLIC", "CONNECTIONS"])
        .default("PUBLIC")
        .describe("Post audience"),
      media_url: z
        .string()
        .url()
        .optional()
        .describe("URL of an article or image to attach"),
      media_title: z.string().optional().describe("Title for attached media"),
    },
    async (args) => {
      if (!accessToken() || !personUrn()) return notConfigured();
      try {
        const body: Record<string, unknown> = {
          author: `urn:li:person:${personUrn()}`,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: args.text },
              shareMediaCategory: args.media_url ? "ARTICLE" : "NONE",
              ...(args.media_url
                ? {
                    media: [
                      {
                        status: "READY",
                        originalUrl: args.media_url,
                        ...(args.media_title
                          ? { title: { text: args.media_title } }
                          : {}),
                      },
                    ],
                  }
                : {}),
            },
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": args.visibility,
          },
        };
        const res = await fetch(`${LINKEDIN_API}/ugcPosts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken()}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          return errorResponse(
            "LINKEDIN_CREATE_FAILED",
            `LinkedIn API error ${res.status}`,
            err.message ?? "Check OAuth2 token and person URN"
          );
        }
        const postId = res.headers.get("x-restli-id") ?? "unknown";
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                post_id: postId,
                status: "published",
                url: `https://www.linkedin.com/feed/update/${postId}`,
              }),
            },
          ],
        };
      } catch {
        return errorResponse(
          "LINKEDIN_NETWORK_ERROR",
          "Failed to reach LinkedIn API",
          "Check network connectivity"
        );
      }
    }
  );

  server.tool(
    "linkedin_list_posts",
    "List recent UGC posts for the authenticated LinkedIn member. readOnlyHint=true destructiveHint=false idempotentHint=true",
    {
      limit: z.number().int().min(1).max(50).default(20),
      offset: z.number().int().min(0).default(0),
    },
    async (args) => {
      if (!accessToken() || !personUrn()) return notConfigured();
      try {
        const params = new URLSearchParams({
          q: "authors",
          authors: `List(urn:li:person:${personUrn()})`,
          count: String(args.limit),
          start: String(args.offset),
        });
        const res = await fetch(`${LINKEDIN_API}/ugcPosts?${params}`, {
          headers: {
            Authorization: `Bearer ${accessToken()}`,
            "X-Restli-Protocol-Version": "2.0.0",
          },
        });
        if (!res.ok) {
          return errorResponse(
            "LINKEDIN_LIST_FAILED",
            `LinkedIn API error ${res.status}`,
            "Check OAuth2 token and person URN"
          );
        }
        const data = (await res.json()) as {
          elements?: unknown[];
          paging?: { total: number };
        };
        const items = data.elements ?? [];
        const total = data.paging?.total ?? items.length;
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
          "LINKEDIN_NETWORK_ERROR",
          "Failed to reach LinkedIn API",
          "Check network connectivity"
        );
      }
    }
  );
}

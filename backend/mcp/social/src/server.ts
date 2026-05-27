import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { z } from "zod";

const AUTH_TOKEN = process.env.SOCIAL_MCP_TOKEN || "";
const PORT = parseInt(process.env.PORT || "3001", 10);

const server = new McpServer({
  name: "social-media-mcp",
  version: "1.0.0",
});

// ─── Tool: social_create_post ────────────────────────────────────────────────
server.registerTool(
  "social_create_post",
  {
    description: "Create and optionally schedule a post on a social platform.",
    inputSchema: z.object({
      platform: z.enum(["twitter", "linkedin", "instagram", "facebook"]),
      content: z.string().max(5000),
      media_urls: z.array(z.string().url()).optional(),
      schedule_at: z.string().datetime().optional(),
    }),
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  async ({ platform, content, media_urls, schedule_at }) => {
    // Platform API calls go here — stub returns mock data
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            post_id: `${platform}_${Date.now()}`,
            platform,
            scheduled_at: schedule_at ?? null,
            status: schedule_at ? "scheduled" : "published",
          }),
        },
      ],
    };
  }
);

// ─── Tool: social_get_analytics ──────────────────────────────────────────────
server.registerTool(
  "social_get_analytics",
  {
    description: "Retrieve engagement analytics for a specific post.",
    inputSchema: z.object({
      platform: z.enum(["twitter", "linkedin", "instagram", "facebook"]),
      post_id: z.string(),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ platform, post_id }) => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            post_id,
            platform,
            impressions: 0,
            engagements: 0,
            clicks: 0,
            shares: 0,
            likes: 0,
          }),
        },
      ],
    };
  }
);

// ─── Tool: social_list_scheduled_posts ───────────────────────────────────────
server.registerTool(
  "social_list_scheduled_posts",
  {
    description: "List all scheduled posts for a platform in a workspace.",
    inputSchema: z.object({
      platform: z.enum(["twitter", "linkedin", "instagram", "facebook"]),
      workspace_id: z.string(),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ platform, workspace_id }) => {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ posts: [], platform, workspace_id }) }],
    };
  }
);

// ─── Tool: social_delete_post ────────────────────────────────────────────────
server.registerTool(
  "social_delete_post",
  {
    description: "Delete a post from a social platform.",
    inputSchema: z.object({
      platform: z.enum(["twitter", "linkedin", "instagram", "facebook"]),
      post_id: z.string(),
    }),
    annotations: { destructiveHint: true, idempotentHint: true },
  },
  async ({ platform, post_id }) => {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ success: true, post_id, platform }) }],
    };
  }
);

// ─── Tool: social_generate_content ───────────────────────────────────────────
server.registerTool(
  "social_generate_content",
  {
    description: "Generate platform-optimised social content for a topic.",
    inputSchema: z.object({
      topic: z.string(),
      tone: z.string(),
      platform: z.enum(["twitter", "linkedin", "instagram", "facebook"]),
      brand_voice: z.string().optional(),
    }),
    annotations: { readOnlyHint: false },
  },
  async ({ topic, tone, platform, brand_voice }) => {
    const charLimits: Record<string, number> = {
      twitter: 280,
      linkedin: 3000,
      instagram: 2200,
      facebook: 63206,
    };
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            platform,
            suggested_text: `[Generated content for "${topic}" on ${platform} with ${tone} tone]`,
            char_limit: charLimits[platform],
            brand_voice_applied: !!brand_voice,
          }),
        },
      ],
    };
  }
);

// ─── Tool: social_get_trending_topics ────────────────────────────────────────
server.registerTool(
  "social_get_trending_topics",
  {
    description: "Get trending topics on a platform for a given industry.",
    inputSchema: z.object({
      platform: z.enum(["twitter", "linkedin", "instagram", "facebook"]),
      industry: z.string(),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ platform, industry }) => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ platform, industry, trending: [] }),
        },
      ],
    };
  }
);

// ─── HTTP transport ──────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.use((req: Request, res: Response, next) => {
  if (AUTH_TOKEN) {
    const token = req.headers["authorization"]?.replace("Bearer ", "");
    if (token !== AUTH_TOKEN) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }
  next();
});

app.post("/mcp", async (req: Request, res: Response) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", server: "social-media-mcp" });
});

app.listen(PORT, () => {
  console.log(`Social MCP server running on port ${PORT}`);
});

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { z } from "zod";

const AUTH_TOKEN = process.env.EMAIL_MCP_TOKEN || "";
const PORT = parseInt(process.env.PORT || "3002", 10);

const server = new McpServer({
  name: "email-support-mcp",
  version: "1.0.0",
});

// ─── Tool: email_send ────────────────────────────────────────────────────────
server.registerTool(
  "email_send",
  {
    description: "Send a transactional email via SendGrid or Gmail.",
    inputSchema: z.object({
      to: z.string().email(),
      subject: z.string().max(998),
      body: z.string(),
      template_id: z.string().optional(),
    }),
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  async ({ to, subject, body, template_id }) => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            message_id: `msg_${Date.now()}`,
            to,
            subject,
            template_id: template_id ?? null,
          }),
        },
      ],
    };
  }
);

// ─── Tool: email_create_campaign ─────────────────────────────────────────────
server.registerTool(
  "email_create_campaign",
  {
    description: "Create an email campaign with audience segmentation.",
    inputSchema: z.object({
      name: z.string(),
      audience_segment: z.string(),
      template: z.string(),
    }),
    annotations: { destructiveHint: false },
  },
  async ({ name, audience_segment, template }) => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            campaign_id: `campaign_${Date.now()}`,
            name,
            audience_segment,
            status: "draft",
          }),
        },
      ],
    };
  }
);

// ─── Tool: email_get_thread ───────────────────────────────────────────────────
server.registerTool(
  "email_get_thread",
  {
    description: "Retrieve a full email thread by ID.",
    inputSchema: z.object({ thread_id: z.string() }),
    annotations: { readOnlyHint: true },
  },
  async ({ thread_id }) => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ thread_id, messages: [] }),
        },
      ],
    };
  }
);

// ─── Tool: support_create_ticket ─────────────────────────────────────────────
server.registerTool(
  "support_create_ticket",
  {
    description: "Create a support ticket in Zendesk or Intercom.",
    inputSchema: z.object({
      customer_id: z.string(),
      subject: z.string(),
      body: z.string(),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
    }),
    annotations: { destructiveHint: false },
  },
  async ({ customer_id, subject, body, priority }) => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            ticket_id: `ticket_${Date.now()}`,
            customer_id,
            priority,
            status: "open",
          }),
        },
      ],
    };
  }
);

// ─── Tool: support_auto_reply ─────────────────────────────────────────────────
server.registerTool(
  "support_auto_reply",
  {
    description: "Generate and send an AI-powered first response to a support ticket.",
    inputSchema: z.object({
      ticket_id: z.string(),
      context: z.string(),
    }),
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  async ({ ticket_id, context }) => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            ticket_id,
            reply_sent: true,
            context_used: context.length,
          }),
        },
      ],
    };
  }
);

// ─── Tool: support_escalate_ticket ───────────────────────────────────────────
server.registerTool(
  "support_escalate_ticket",
  {
    description: "Escalate a support ticket to a human agent.",
    inputSchema: z.object({
      ticket_id: z.string(),
      reason: z.string(),
    }),
    annotations: { destructiveHint: false },
  },
  async ({ ticket_id, reason }) => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ success: true, ticket_id, escalated: true, reason }),
        },
      ],
    };
  }
);

// ─── Tool: support_get_queue ──────────────────────────────────────────────────
server.registerTool(
  "support_get_queue",
  {
    description: "Get the current support ticket queue with optional filters.",
    inputSchema: z.object({
      status_filter: z.enum(["open", "pending", "solved", "closed"]).optional(),
      priority_filter: z.enum(["low", "normal", "high", "urgent"]).optional(),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ status_filter, priority_filter }) => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            tickets: [],
            filters: { status_filter, priority_filter },
          }),
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
  res.json({ status: "ok", server: "email-support-mcp" });
});

app.listen(PORT, () => {
  console.log(`Email & Support MCP server running on port ${PORT}`);
});

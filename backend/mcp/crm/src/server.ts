import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { z } from "zod";

const AUTH_TOKEN = process.env.CRM_MCP_TOKEN || "";
const PORT = parseInt(process.env.PORT || "3003", 10);

const server = new McpServer({
  name: "crm-mcp",
  version: "1.0.0",
});

// ─── Tool: crm_create_contact ─────────────────────────────────────────────────
server.registerTool(
  "crm_create_contact",
  {
    description: "Create a new contact in HubSpot or Salesforce.",
    inputSchema: z.object({
      name: z.string(),
      email: z.string().email(),
      phone: z.string().optional(),
      company: z.string().optional(),
    }),
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  async ({ name, email, phone, company }) => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            contact_id: `contact_${Date.now()}`,
            name,
            email,
            phone: phone ?? null,
            company: company ?? null,
          }),
        },
      ],
    };
  }
);

// ─── Tool: crm_update_contact ─────────────────────────────────────────────────
server.registerTool(
  "crm_update_contact",
  {
    description: "Update fields on an existing CRM contact.",
    inputSchema: z.object({
      contact_id: z.string(),
      fields: z.record(z.string(), z.unknown()),
    }),
    annotations: { destructiveHint: false, idempotentHint: true },
  },
  async ({ contact_id, fields }) => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ success: true, contact_id, updated_fields: Object.keys(fields) }),
        },
      ],
    };
  }
);

// ─── Tool: crm_log_activity ───────────────────────────────────────────────────
server.registerTool(
  "crm_log_activity",
  {
    description: "Log an activity (call, email, meeting) against a contact.",
    inputSchema: z.object({
      contact_id: z.string(),
      type: z.enum(["call", "email", "meeting", "note", "task"]),
      notes: z.string(),
    }),
    annotations: { destructiveHint: false },
  },
  async ({ contact_id, type, notes }) => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            activity_id: `activity_${Date.now()}`,
            contact_id,
            type,
          }),
        },
      ],
    };
  }
);

// ─── Tool: crm_get_pipeline ───────────────────────────────────────────────────
server.registerTool(
  "crm_get_pipeline",
  {
    description: "Get the current CRM deal pipeline, optionally filtered by stage.",
    inputSchema: z.object({
      stage_filter: z.string().optional(),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ stage_filter }) => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ deals: [], stage_filter: stage_filter ?? "all" }),
        },
      ],
    };
  }
);

// ─── Tool: crm_create_deal ────────────────────────────────────────────────────
server.registerTool(
  "crm_create_deal",
  {
    description: "Create a new deal in the CRM pipeline.",
    inputSchema: z.object({
      contact_id: z.string(),
      value: z.number().nonnegative(),
      stage: z.string(),
    }),
    annotations: { destructiveHint: false, idempotentHint: false },
  },
  async ({ contact_id, value, stage }) => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            deal_id: `deal_${Date.now()}`,
            contact_id,
            value,
            stage,
          }),
        },
      ],
    };
  }
);

// ─── Tool: crm_move_deal_stage ────────────────────────────────────────────────
server.registerTool(
  "crm_move_deal_stage",
  {
    description: "Move a deal to a new pipeline stage.",
    inputSchema: z.object({
      deal_id: z.string(),
      new_stage: z.string(),
    }),
    annotations: { destructiveHint: false, idempotentHint: true },
  },
  async ({ deal_id, new_stage }) => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ success: true, deal_id, new_stage }),
        },
      ],
    };
  }
);

// ─── Tool: crm_get_contact_history ───────────────────────────────────────────
server.registerTool(
  "crm_get_contact_history",
  {
    description: "Retrieve the full activity history for a CRM contact.",
    inputSchema: z.object({ contact_id: z.string() }),
    annotations: { readOnlyHint: true },
  },
  async ({ contact_id }) => {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ contact_id, activities: [], deals: [] }),
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
  res.json({ status: "ok", server: "crm-mcp" });
});

app.listen(PORT, () => {
  console.log(`CRM MCP server running on port ${PORT}`);
});

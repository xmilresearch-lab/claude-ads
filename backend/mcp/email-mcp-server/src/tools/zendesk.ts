import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResponse } from "../lib/errors.js";
import { paginate } from "../lib/pagination.js";

function zdBase(): string {
  const sub = process.env["ZENDESK_SUBDOMAIN"] ?? "";
  return `https://${sub}.zendesk.com/api/v2`;
}

function zdHeaders(): Record<string, string> {
  const email = process.env["ZENDESK_EMAIL"] ?? "";
  const token = process.env["ZENDESK_API_TOKEN"] ?? "";
  const creds = Buffer.from(`${email}/token:${token}`).toString("base64");
  return {
    Authorization: `Basic ${creds}`,
    "Content-Type": "application/json",
  };
}

function zdConfigured(): boolean {
  return Boolean(
    process.env["ZENDESK_SUBDOMAIN"] &&
      process.env["ZENDESK_EMAIL"] &&
      process.env["ZENDESK_API_TOKEN"]
  );
}

function notConfigured(): ReturnType<typeof errorResponse> {
  return errorResponse(
    "ZENDESK_NOT_CONFIGURED",
    "Zendesk credentials are not configured",
    "Set ZENDESK_SUBDOMAIN, ZENDESK_EMAIL, and ZENDESK_API_TOKEN"
  );
}

export function registerZendeskTools(server: McpServer): void {
  server.tool(
    "support_create_ticket",
    "Create a new Zendesk support ticket. readOnlyHint=false destructiveHint=false idempotentHint=false",
    {
      subject: z.string().min(1).max(500),
      body: z.string().min(1).describe("Ticket description"),
      requester_email: z.string().email(),
      requester_name: z.string().optional(),
      priority: z
        .enum(["urgent", "high", "normal", "low"])
        .default("normal"),
      tags: z.array(z.string()).optional(),
      custom_fields: z
        .array(z.object({ id: z.number(), value: z.unknown() }))
        .optional(),
    },
    async (args) => {
      if (!zdConfigured()) return notConfigured();
      try {
        const body = {
          ticket: {
            subject: args.subject,
            comment: { body: args.body },
            requester: {
              email: args.requester_email,
              ...(args.requester_name
                ? { name: args.requester_name }
                : {}),
            },
            priority: args.priority,
            ...(args.tags ? { tags: args.tags } : {}),
            ...(args.custom_fields
              ? { custom_fields: args.custom_fields }
              : {}),
          },
        };
        const res = await fetch(`${zdBase()}/tickets.json`, {
          method: "POST",
          headers: zdHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as {
            description?: string;
          };
          return errorResponse(
            "ZENDESK_CREATE_FAILED",
            `Zendesk API error ${res.status}`,
            err.description ?? "Verify credentials and subdomain"
          );
        }
        const data = (await res.json()) as {
          ticket: { id: number; url: string; status: string };
        };
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                ticket_id: data.ticket.id,
                url: data.ticket.url,
                status: data.ticket.status,
              }),
            },
          ],
        };
      } catch {
        return errorResponse(
          "ZENDESK_NETWORK_ERROR",
          "Failed to reach Zendesk API",
          "Check network connectivity"
        );
      }
    }
  );

  server.tool(
    "support_list_tickets",
    "List Zendesk support tickets with optional filters. readOnlyHint=true destructiveHint=false idempotentHint=true",
    {
      status: z
        .enum(["new", "open", "pending", "hold", "solved", "closed"])
        .optional(),
      assignee_email: z.string().email().optional(),
      sort_by: z
        .enum(["created_at", "updated_at", "priority"])
        .default("created_at"),
      sort_order: z.enum(["asc", "desc"]).default("desc"),
      limit: z.number().int().min(1).max(100).default(25),
      offset: z.number().int().min(0).default(0),
    },
    async (args) => {
      if (!zdConfigured()) return notConfigured();
      try {
        const page = Math.floor(args.offset / args.limit) + 1;
        const params = new URLSearchParams({
          per_page: String(args.limit),
          page: String(page),
          sort_by: args.sort_by,
          sort_order: args.sort_order,
          ...(args.status ? { status: args.status } : {}),
          ...(args.assignee_email
            ? { assignee: args.assignee_email }
            : {}),
        });
        const res = await fetch(`${zdBase()}/tickets.json?${params}`, {
          headers: zdHeaders(),
        });
        if (!res.ok) {
          return errorResponse(
            "ZENDESK_LIST_FAILED",
            `Zendesk API error ${res.status}`,
            "Check Zendesk API credentials"
          );
        }
        const data = (await res.json()) as {
          tickets: unknown[];
          count?: number;
        };
        const total = data.count ?? data.tickets.length;
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                paginate(data.tickets, args.offset, args.limit, total)
              ),
            },
          ],
        };
      } catch {
        return errorResponse(
          "ZENDESK_NETWORK_ERROR",
          "Failed to reach Zendesk API",
          "Check network connectivity"
        );
      }
    }
  );

  server.tool(
    "support_reply_ticket",
    "Add a reply or internal note to an existing Zendesk ticket. readOnlyHint=false destructiveHint=false idempotentHint=false",
    {
      ticket_id: z.number().int().positive(),
      body: z.string().min(1),
      public: z
        .boolean()
        .default(true)
        .describe("true = public reply, false = internal note"),
      status: z
        .enum(["open", "pending", "solved"])
        .optional()
        .describe("Optionally update ticket status with this reply"),
    },
    async (args) => {
      if (!zdConfigured()) return notConfigured();
      try {
        const body: Record<string, unknown> = {
          ticket: {
            comment: { body: args.body, public: args.public },
            ...(args.status ? { status: args.status } : {}),
          },
        };
        const res = await fetch(
          `${zdBase()}/tickets/${args.ticket_id}.json`,
          {
            method: "PUT",
            headers: zdHeaders(),
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as {
            description?: string;
          };
          return errorResponse(
            "ZENDESK_REPLY_FAILED",
            `Zendesk API error ${res.status}`,
            err.description ??
              "Verify ticket_id exists and agent has permission"
          );
        }
        const data = (await res.json()) as {
          ticket: { id: number; status: string; updated_at: string };
        };
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                ticket_id: data.ticket.id,
                status: data.ticket.status,
                updated_at: data.ticket.updated_at,
              }),
            },
          ],
        };
      } catch {
        return errorResponse(
          "ZENDESK_NETWORK_ERROR",
          "Failed to reach Zendesk API",
          "Check network connectivity"
        );
      }
    }
  );
}

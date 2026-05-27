import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResponse } from "../lib/errors.js";
import { paginate } from "../lib/pagination.js";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

function gmailToken(): string {
  return process.env["GMAIL_ACCESS_TOKEN"] ?? "";
}

function notConfigured(): ReturnType<typeof errorResponse> {
  return errorResponse(
    "GMAIL_NOT_CONFIGURED",
    "Gmail access token is not configured",
    "Set the GMAIL_ACCESS_TOKEN environment variable"
  );
}

export function registerGmailTools(server: McpServer): void {
  server.tool(
    "email_send_message",
    "Send an email via Gmail. readOnlyHint=false destructiveHint=false idempotentHint=false",
    {
      to: z.array(z.string().email()).min(1).describe("Recipient addresses"),
      subject: z.string().min(1).max(500),
      body: z.string().min(1),
      body_type: z.enum(["plain", "html"]).default("plain"),
      cc: z.array(z.string().email()).optional(),
      bcc: z.array(z.string().email()).optional(),
      reply_to: z.string().email().optional(),
    },
    async (args) => {
      if (!gmailToken()) return notConfigured();
      try {
        const headerLines = [
          `To: ${args.to.join(", ")}`,
          `Subject: ${args.subject}`,
          `Content-Type: ${
            args.body_type === "html" ? "text/html" : "text/plain"
          }; charset=utf-8`,
          ...(args.cc ? [`Cc: ${args.cc.join(", ")}`] : []),
          ...(args.bcc ? [`Bcc: ${args.bcc.join(", ")}`] : []),
          ...(args.reply_to ? [`Reply-To: ${args.reply_to}`] : []),
        ].join("\r\n");
        const raw = Buffer.from(`${headerLines}\r\n\r\n${args.body}`)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");
        const res = await fetch(`${GMAIL_API}/messages/send`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${gmailToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          return errorResponse(
            "GMAIL_SEND_FAILED",
            `Gmail API error ${res.status}`,
            err.error?.message ?? "Check Gmail OAuth token and scopes"
          );
        }
        const data = (await res.json()) as { id: string; threadId: string };
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                message_id: data.id,
                thread_id: data.threadId,
                status: "sent",
              }),
            },
          ],
        };
      } catch {
        return errorResponse(
          "GMAIL_NETWORK_ERROR",
          "Failed to reach Gmail API",
          "Check network connectivity"
        );
      }
    }
  );

  server.tool(
    "email_list_messages",
    "List Gmail messages matching an optional query. readOnlyHint=true destructiveHint=false idempotentHint=true",
    {
      query: z
        .string()
        .optional()
        .describe("Gmail search query e.g. 'from:user@example.com is:unread'"),
      label: z
        .string()
        .optional()
        .describe("Label filter e.g. INBOX, SENT, UNREAD"),
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    },
    async (args) => {
      if (!gmailToken()) return notConfigured();
      try {
        const params = new URLSearchParams({
          maxResults: String(args.limit),
          ...(args.query ? { q: args.query } : {}),
          ...(args.label ? { labelIds: args.label } : {}),
        });
        const res = await fetch(`${GMAIL_API}/messages?${params}`, {
          headers: { Authorization: `Bearer ${gmailToken()}` },
        });
        if (!res.ok) {
          return errorResponse(
            "GMAIL_LIST_FAILED",
            `Gmail API error ${res.status}`,
            "Check Gmail credentials"
          );
        }
        const data = (await res.json()) as {
          messages?: Array<{ id: string; threadId: string }>;
          resultSizeEstimate?: number;
        };
        const messages = data.messages ?? [];
        const total = data.resultSizeEstimate ?? messages.length;
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                paginate(messages, args.offset, args.limit, total)
              ),
            },
          ],
        };
      } catch {
        return errorResponse(
          "GMAIL_NETWORK_ERROR",
          "Failed to reach Gmail API",
          "Check network connectivity"
        );
      }
    }
  );

  server.tool(
    "email_get_message",
    "Fetch the full content of a specific Gmail message. readOnlyHint=true destructiveHint=false idempotentHint=true",
    {
      message_id: z.string().describe("Gmail message ID"),
      format: z
        .enum(["full", "metadata", "minimal"])
        .default("full")
        .describe("Message format"),
    },
    async (args) => {
      if (!gmailToken()) return notConfigured();
      try {
        const res = await fetch(
          `${GMAIL_API}/messages/${args.message_id}?format=${args.format}`,
          { headers: { Authorization: `Bearer ${gmailToken()}` } }
        );
        if (!res.ok) {
          return errorResponse(
            "GMAIL_GET_FAILED",
            `Gmail API error ${res.status}`,
            "Verify the message_id is correct and accessible"
          );
        }
        const data: unknown = await res.json();
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(data) },
          ],
        };
      } catch {
        return errorResponse(
          "GMAIL_NETWORK_ERROR",
          "Failed to reach Gmail API",
          "Check network connectivity"
        );
      }
    }
  );
}

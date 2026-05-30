import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResponse } from "../lib/errors.js";

const SENDGRID_API = "https://api.sendgrid.com/v3";

function sgKey(): string {
  return process.env["SENDGRID_API_KEY"] ?? "";
}

function notConfigured(): ReturnType<typeof errorResponse> {
  return errorResponse(
    "SENDGRID_NOT_CONFIGURED",
    "SendGrid API key is not configured",
    "Set the SENDGRID_API_KEY environment variable"
  );
}

export function registerSendGridTools(server: McpServer): void {
  server.tool(
    "email_send_campaign",
    "Send a bulk email campaign via SendGrid (up to 1 000 recipients per call). readOnlyHint=false destructiveHint=false idempotentHint=false",
    {
      from_email: z.string().email().describe("Verified sender email"),
      from_name: z.string().optional(),
      subject: z.string().min(1).max(500),
      html_content: z.string().optional().describe("HTML body (use template_id instead for dynamic templates)"),
      plain_content: z.string().optional().describe("Plain-text fallback body"),
      to: z
        .array(
          z.object({
            email: z.string().email(),
            name: z.string().optional(),
            substitutions: z.record(z.string()).optional(),
          })
        )
        .min(1)
        .max(1000),
      template_id: z
        .string()
        .optional()
        .describe("SendGrid dynamic template ID"),
      template_data: z
        .record(z.unknown())
        .optional()
        .describe("Template substitution data"),
      send_at: z
        .number()
        .int()
        .optional()
        .describe("Unix timestamp to schedule delivery"),
    },
    async (args) => {
      if (!sgKey()) return notConfigured();
      try {
        const body: Record<string, unknown> = {
          personalizations: args.to.map((r) => ({
            to: [{ email: r.email, ...(r.name ? { name: r.name } : {}) }],
            ...(r.substitutions ? { substitutions: r.substitutions } : {}),
            ...(args.template_data
              ? { dynamic_template_data: args.template_data }
              : {}),
          })),
          from: {
            email: args.from_email,
            ...(args.from_name ? { name: args.from_name } : {}),
          },
          subject: args.subject,
          ...(args.html_content
            ? { content: [{ type: "text/html", value: args.html_content }] }
            : args.plain_content
            ? { content: [{ type: "text/plain", value: args.plain_content }] }
            : {}),
          ...(args.template_id ? { template_id: args.template_id } : {}),
          ...(args.send_at ? { send_at: args.send_at } : {}),
        };
        const res = await fetch(`${SENDGRID_API}/mail/send`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sgKey()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as {
            errors?: Array<{ message: string }>;
          };
          return errorResponse(
            "SENDGRID_SEND_FAILED",
            `SendGrid API error ${res.status}`,
            err.errors?.[0]?.message ??
              "Check API key and sender verification"
          );
        }
        const messageId = res.headers.get("x-message-id") ?? "unknown";
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                status: "queued",
                message_id: messageId,
                recipient_count: args.to.length,
              }),
            },
          ],
        };
      } catch {
        return errorResponse(
          "SENDGRID_NETWORK_ERROR",
          "Failed to reach SendGrid API",
          "Check network connectivity"
        );
      }
    }
  );
}

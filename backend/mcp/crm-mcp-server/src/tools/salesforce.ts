import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResponse } from "../lib/errors.js";
import { paginate } from "../lib/pagination.js";

function sfBase(): string {
  const instance = process.env["SALESFORCE_INSTANCE_URL"] ?? "";
  const version = process.env["SALESFORCE_API_VERSION"] ?? "v59.0";
  return `${instance}/services/data/${version}`;
}
function sfToken(): string {
  return process.env["SALESFORCE_ACCESS_TOKEN"] ?? "";
}
function sfConfigured(): boolean {
  return Boolean(
    process.env["SALESFORCE_INSTANCE_URL"] && process.env["SALESFORCE_ACCESS_TOKEN"]
  );
}
function notConfigured(): ReturnType<typeof errorResponse> {
  return errorResponse(
    "SALESFORCE_NOT_CONFIGURED",
    "Salesforce credentials are not configured",
    "Set SALESFORCE_INSTANCE_URL and SALESFORCE_ACCESS_TOKEN"
  );
}
function sfHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${sfToken()}`,
    "Content-Type": "application/json",
  };
}

export function registerSalesforceTools(server: McpServer): void {
  server.tool(
    "salesforce_create_record",
    "Create a new Salesforce sObject record (Contact, Lead, Account, Opportunity, etc.). readOnlyHint=false destructiveHint=false idempotentHint=false",
    {
      sobject: z
        .string()
        .describe("Salesforce object type e.g. Contact, Lead, Opportunity"),
      fields: z
        .record(z.unknown())
        .describe("Field name/value pairs for the new record"),
    },
    async (args) => {
      if (!sfConfigured()) return notConfigured();
      try {
        const res = await fetch(
          `${sfBase()}/sobjects/${args.sobject}`,
          {
            method: "POST",
            headers: sfHeaders(),
            body: JSON.stringify(args.fields),
          }
        );
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as Array<{
            message?: string;
            errorCode?: string;
          }>;
          return errorResponse(
            "SALESFORCE_CREATE_FAILED",
            `Salesforce API error ${res.status}`,
            Array.isArray(err) && err[0]?.message
              ? err[0].message
              : "Check field names and required fields"
          );
        }
        const data = (await res.json()) as { id: string; success: boolean };
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                record_id: data.id,
                sobject: args.sobject,
                status: "created",
              }),
            },
          ],
        };
      } catch {
        return errorResponse(
          "SALESFORCE_NETWORK_ERROR",
          "Failed to reach Salesforce API",
          "Check network connectivity and instance URL"
        );
      }
    }
  );

  server.tool(
    "salesforce_update_record",
    "Update fields on an existing Salesforce sObject record. readOnlyHint=false destructiveHint=false idempotentHint=true",
    {
      sobject: z.string().describe("Salesforce object type e.g. Contact"),
      record_id: z.string().describe("18-character Salesforce record ID"),
      fields: z.record(z.unknown()).describe("Fields to update"),
    },
    async (args) => {
      if (!sfConfigured()) return notConfigured();
      try {
        const res = await fetch(
          `${sfBase()}/sobjects/${args.sobject}/${args.record_id}`,
          {
            method: "PATCH",
            headers: sfHeaders(),
            body: JSON.stringify(args.fields),
          }
        );
        // 204 No Content = success for PATCH
        if (res.status === 204) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  record_id: args.record_id,
                  sobject: args.sobject,
                  status: "updated",
                }),
              },
            ],
          };
        }
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as Array<{
            message?: string;
          }>;
          return errorResponse(
            "SALESFORCE_UPDATE_FAILED",
            `Salesforce API error ${res.status}`,
            Array.isArray(err) && err[0]?.message
              ? err[0].message
              : "Check record ID and field names"
          );
        }
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                record_id: args.record_id,
                sobject: args.sobject,
                status: "updated",
              }),
            },
          ],
        };
      } catch {
        return errorResponse(
          "SALESFORCE_NETWORK_ERROR",
          "Failed to reach Salesforce API",
          "Check network connectivity and instance URL"
        );
      }
    }
  );

  server.tool(
    "salesforce_query_records",
    "Run a SOQL query against Salesforce and return paginated results. readOnlyHint=true destructiveHint=false idempotentHint=true",
    {
      soql: z
        .string()
        .min(1)
        .describe("Full SOQL query e.g. SELECT Id, Name FROM Contact WHERE ..."),
      limit: z.number().int().min(1).max(200).default(20),
      offset: z.number().int().min(0).default(0),
    },
    async (args) => {
      if (!sfConfigured()) return notConfigured();
      try {
        const params = new URLSearchParams({ q: args.soql });
        const res = await fetch(
          `${sfBase()}/query?${params}`,
          { headers: sfHeaders() }
        );
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as Array<{
            message?: string;
            errorCode?: string;
          }>;
          return errorResponse(
            "SALESFORCE_QUERY_FAILED",
            `Salesforce API error ${res.status}`,
            Array.isArray(err) && err[0]?.message
              ? err[0].message
              : "Verify SOQL syntax and field API names"
          );
        }
        const data = (await res.json()) as {
          records: unknown[];
          totalSize: number;
          done: boolean;
        };
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                paginate(data.records, args.offset, args.limit, data.totalSize)
              ),
            },
          ],
        };
      } catch {
        return errorResponse(
          "SALESFORCE_NETWORK_ERROR",
          "Failed to reach Salesforce API",
          "Check network connectivity and instance URL"
        );
      }
    }
  );
}

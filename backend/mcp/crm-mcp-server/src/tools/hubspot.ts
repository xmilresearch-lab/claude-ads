import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResponse } from "../lib/errors.js";
import { paginate } from "../lib/pagination.js";

const HS_API = "https://api.hubapi.com";

function hsToken(): string {
  return process.env["HUBSPOT_ACCESS_TOKEN"] ?? "";
}
function notConfigured(): ReturnType<typeof errorResponse> {
  return errorResponse(
    "HUBSPOT_NOT_CONFIGURED",
    "HubSpot access token is not configured",
    "Set the HUBSPOT_ACCESS_TOKEN environment variable"
  );
}
function hsHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${hsToken()}`,
    "Content-Type": "application/json",
  };
}

export function registerHubSpotTools(server: McpServer): void {
  server.tool(
    "hubspot_upsert_contact",
    "Create or update a HubSpot contact by email (upsert). readOnlyHint=false destructiveHint=false idempotentHint=true",
    {
      email: z.string().email(),
      firstname: z.string().optional(),
      lastname: z.string().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      jobtitle: z.string().optional(),
      properties: z
        .record(z.string())
        .optional()
        .describe("Any additional HubSpot contact properties"),
    },
    async (args) => {
      if (!hsToken()) return notConfigured();
      try {
        const props: Record<string, string> = {
          email: args.email,
          ...(args.firstname ? { firstname: args.firstname } : {}),
          ...(args.lastname ? { lastname: args.lastname } : {}),
          ...(args.phone ? { phone: args.phone } : {}),
          ...(args.company ? { company: args.company } : {}),
          ...(args.jobtitle ? { jobtitle: args.jobtitle } : {}),
          ...args.properties,
        };
        const res = await fetch(
          `${HS_API}/crm/v3/objects/contacts`,
          {
            method: "POST",
            headers: hsHeaders(),
            body: JSON.stringify({ properties: props }),
          }
        );
        // 409 = already exists — fetch by email and update instead
        if (res.status === 409) {
          const searchRes = await fetch(
            `${HS_API}/crm/v3/objects/contacts/search`,
            {
              method: "POST",
              headers: hsHeaders(),
              body: JSON.stringify({
                filterGroups: [
                  {
                    filters: [
                      { propertyName: "email", operator: "EQ", value: args.email },
                    ],
                  },
                ],
                properties: ["hs_object_id"],
                limit: 1,
              }),
            }
          );
          const found = (await searchRes.json()) as {
            results?: Array<{ id: string }>;
          };
          const contactId = found.results?.[0]?.id;
          if (!contactId) {
            return errorResponse(
              "HUBSPOT_UPSERT_FAILED",
              "Contact exists but could not be found for update",
              "Verify email address is correct"
            );
          }
          const patchRes = await fetch(
            `${HS_API}/crm/v3/objects/contacts/${contactId}`,
            {
              method: "PATCH",
              headers: hsHeaders(),
              body: JSON.stringify({ properties: props }),
            }
          );
          if (!patchRes.ok) {
            return errorResponse(
              "HUBSPOT_UPDATE_FAILED",
              `HubSpot API error ${patchRes.status}`,
              "Check token permissions"
            );
          }
          const updated = (await patchRes.json()) as { id: string };
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ contact_id: updated.id, action: "updated" }),
              },
            ],
          };
        }
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          return errorResponse(
            "HUBSPOT_CREATE_FAILED",
            `HubSpot API error ${res.status}`,
            err.message ?? "Check token and property names"
          );
        }
        const data = (await res.json()) as { id: string };
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ contact_id: data.id, action: "created" }),
            },
          ],
        };
      } catch {
        return errorResponse(
          "HUBSPOT_NETWORK_ERROR",
          "Failed to reach HubSpot API",
          "Check network connectivity"
        );
      }
    }
  );

  server.tool(
    "hubspot_list_contacts",
    "List HubSpot contacts with optional property filter. readOnlyHint=true destructiveHint=false idempotentHint=true",
    {
      properties: z
        .array(z.string())
        .optional()
        .default(["email", "firstname", "lastname", "company"])
        .describe("Properties to return"),
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    },
    async (args) => {
      if (!hsToken()) return notConfigured();
      try {
        const params = new URLSearchParams({
          limit: String(args.limit),
          properties: (args.properties ?? ["email", "firstname", "lastname", "company"]).join(","),
        });
        const res = await fetch(
          `${HS_API}/crm/v3/objects/contacts?${params}`,
          { headers: hsHeaders() }
        );
        if (!res.ok) {
          return errorResponse(
            "HUBSPOT_LIST_FAILED",
            `HubSpot API error ${res.status}`,
            "Check token permissions"
          );
        }
        const data = (await res.json()) as {
          results?: unknown[];
          total?: number;
          paging?: { next?: { after?: string } };
        };
        const items = data.results ?? [];
        const total = data.total ?? items.length;
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
          "HUBSPOT_NETWORK_ERROR",
          "Failed to reach HubSpot API",
          "Check network connectivity"
        );
      }
    }
  );

  server.tool(
    "hubspot_create_deal",
    "Create a new deal in HubSpot CRM. readOnlyHint=false destructiveHint=false idempotentHint=false",
    {
      dealname: z.string().min(1),
      amount: z.number().nonnegative().optional().describe("Deal value"),
      pipeline: z
        .string()
        .optional()
        .default("default")
        .describe("Pipeline ID"),
      dealstage: z
        .string()
        .optional()
        .default("appointmentscheduled")
        .describe("Pipeline stage ID"),
      closedate: z
        .string()
        .optional()
        .describe("Expected close date ISO-8601"),
      associated_contact_id: z
        .string()
        .optional()
        .describe("HubSpot contact ID to associate"),
      properties: z.record(z.string()).optional(),
    },
    async (args) => {
      if (!hsToken()) return notConfigured();
      try {
        const props: Record<string, string> = {
          dealname: args.dealname,
          pipeline: args.pipeline ?? "default",
          dealstage: args.dealstage ?? "appointmentscheduled",
          ...(args.amount !== undefined
            ? { amount: String(args.amount) }
            : {}),
          ...(args.closedate ? { closedate: args.closedate } : {}),
          ...args.properties,
        };
        const body: Record<string, unknown> = { properties: props };
        if (args.associated_contact_id) {
          body["associations"] = [
            {
              to: { id: args.associated_contact_id },
              types: [
                {
                  associationCategory: "HUBSPOT_DEFINED",
                  associationTypeId: 3,
                },
              ],
            },
          ];
        }
        const res = await fetch(`${HS_API}/crm/v3/objects/deals`, {
          method: "POST",
          headers: hsHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          return errorResponse(
            "HUBSPOT_DEAL_FAILED",
            `HubSpot API error ${res.status}`,
            err.message ?? "Check token and pipeline/stage IDs"
          );
        }
        const data = (await res.json()) as { id: string };
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ deal_id: data.id, status: "created" }),
            },
          ],
        };
      } catch {
        return errorResponse(
          "HUBSPOT_NETWORK_ERROR",
          "Failed to reach HubSpot API",
          "Check network connectivity"
        );
      }
    }
  );

  server.tool(
    "hubspot_update_deal",
    "Update properties of an existing HubSpot deal. readOnlyHint=false destructiveHint=false idempotentHint=true",
    {
      deal_id: z.string().describe("HubSpot deal ID"),
      dealstage: z.string().optional(),
      amount: z.number().nonnegative().optional(),
      closedate: z.string().optional().describe("ISO-8601 date"),
      properties: z
        .record(z.string())
        .optional()
        .describe("Arbitrary property overrides"),
    },
    async (args) => {
      if (!hsToken()) return notConfigured();
      try {
        const props: Record<string, string> = {
          ...(args.dealstage ? { dealstage: args.dealstage } : {}),
          ...(args.amount !== undefined
            ? { amount: String(args.amount) }
            : {}),
          ...(args.closedate ? { closedate: args.closedate } : {}),
          ...args.properties,
        };
        const res = await fetch(
          `${HS_API}/crm/v3/objects/deals/${args.deal_id}`,
          {
            method: "PATCH",
            headers: hsHeaders(),
            body: JSON.stringify({ properties: props }),
          }
        );
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          return errorResponse(
            "HUBSPOT_UPDATE_FAILED",
            `HubSpot API error ${res.status}`,
            err.message ?? "Verify deal ID and property names"
          );
        }
        const data = (await res.json()) as { id: string; properties: unknown };
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                deal_id: data.id,
                properties: data.properties,
                status: "updated",
              }),
            },
          ],
        };
      } catch {
        return errorResponse(
          "HUBSPOT_NETWORK_ERROR",
          "Failed to reach HubSpot API",
          "Check network connectivity"
        );
      }
    }
  );
}

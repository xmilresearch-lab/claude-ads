import { api } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/tokens";
import { API_URL } from "@/lib/utils/constants";
import { format } from "date-fns";

export type AuditAction =
  | "user.login"
  | "user.logout"
  | "user.register"
  | "user.password_changed"
  | "automation.created"
  | "automation.updated"
  | "automation.deleted"
  | "automation.triggered"
  | "automation.toggled"
  | "content.approved"
  | "content.rejected"
  | "content.published"
  | "integration.connected"
  | "integration.disconnected"
  | "workspace.updated"
  | "brand_voice.updated"
  | "api_key.rotated"
  | "webhook.received";

export type AuditResourceType =
  | "user"
  | "automation"
  | "content"
  | "integration"
  | "workspace"
  | "brand_voice"
  | "api_key"
  | "webhook";

export interface AuditLogEntry {
  id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  action: AuditAction;
  resource_type: AuditResourceType;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  status: "success" | "failure";
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogParams {
  action?: AuditAction | "all";
  resource_type?: AuditResourceType | "all";
  user_id?: string;
  status?: "success" | "failure" | "all";
  search?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedAuditLog {
  items: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export function listAuditLog(params?: AuditLogParams): Promise<PaginatedAuditLog> {
  const q = new URLSearchParams();
  if (params?.action && params.action !== "all") q.set("action", params.action);
  if (params?.resource_type && params.resource_type !== "all") q.set("resource_type", params.resource_type);
  if (params?.user_id) q.set("user_id", params.user_id);
  if (params?.status && params.status !== "all") q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  if (params?.date_from) q.set("date_from", params.date_from);
  if (params?.date_to) q.set("date_to", params.date_to);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const qs = q.toString();
  return api.get<PaginatedAuditLog>(`/audit-logs${qs ? `?${qs}` : ""}`);
}

export async function exportAuditLogCSV(
  params?: Omit<AuditLogParams, "limit" | "offset">,
): Promise<void> {
  const q = new URLSearchParams();
  if (params?.action && params.action !== "all") q.set("action", params.action);
  if (params?.resource_type && params.resource_type !== "all") q.set("resource_type", params.resource_type);
  if (params?.user_id) q.set("user_id", params.user_id);
  if (params?.status && params.status !== "all") q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  if (params?.date_from) q.set("date_from", params.date_from);
  if (params?.date_to) q.set("date_to", params.date_to);
  const qs = q.toString();

  const token = getAccessToken();
  const res = await fetch(`${API_URL}/audit-logs/export${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

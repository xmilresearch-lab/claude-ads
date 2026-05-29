import { api } from "@/lib/api/client";

export type UserPlan = "free" | "pro" | "team" | "admin";
export type UserStatus = "active" | "suspended" | "pending";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: UserPlan;
  status: UserStatus;
  workspace_id: string;
  workspace_name: string;
  created_at: string;
  last_active_at?: string;
  automation_count: number;
  token_usage_30d: number;
}

export interface AdminWorkspace {
  id: string;
  name: string;
  owner_name: string;
  owner_email: string;
  plan: UserPlan;
  created_at: string;
  automation_count: number;
  integration_count: number;
  token_usage_30d: number;
  content_published_30d: number;
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "down";
  checked_at: string;
  services: {
    name: string;
    status: "up" | "down" | "slow";
    latency_ms?: number;
    message?: string;
  }[];
  totals: {
    total_users: number;
    total_workspaces: number;
    total_automations: number;
    total_runs_today: number;
    total_tokens_today: number;
    queue_depth: number;
  };
}

export interface AdminUsersParams {
  search?: string;
  plan?: UserPlan | "all";
  status?: UserStatus | "all";
  limit?: number;
  offset?: number;
}

export interface PaginatedAdminUsers {
  items: AdminUser[];
  total: number;
  has_more: boolean;
}

export interface PaginatedAdminWorkspaces {
  items: AdminWorkspace[];
  total: number;
  has_more: boolean;
}

export function listAdminUsers(params?: AdminUsersParams): Promise<PaginatedAdminUsers> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.plan && params.plan !== "all") q.set("plan", params.plan);
  if (params?.status && params.status !== "all") q.set("status", params.status);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const qs = q.toString();
  return api.get<PaginatedAdminUsers>(`/admin/users${qs ? `?${qs}` : ""}`);
}

export function suspendUser(userId: string, reason?: string): Promise<AdminUser> {
  return api.post<AdminUser>(`/admin/users/${userId}/suspend`, { reason });
}

export function unsuspendUser(userId: string): Promise<AdminUser> {
  return api.post<AdminUser>(`/admin/users/${userId}/unsuspend`);
}

export function listAdminWorkspaces(params?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PaginatedAdminWorkspaces> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const qs = q.toString();
  return api.get<PaginatedAdminWorkspaces>(`/admin/workspaces${qs ? `?${qs}` : ""}`);
}

export function getSystemHealth(): Promise<SystemHealth> {
  return api.get<SystemHealth>("/admin/health");
}

export function getAdminTokenUsage(): Promise<{
  today: number;
  this_month: number;
  estimated_cost_usd: number;
  by_workspace: { workspace_name: string; tokens: number }[];
}> {
  return api.get("/admin/tokens");
}

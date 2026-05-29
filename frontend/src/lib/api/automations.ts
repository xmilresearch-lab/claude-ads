import { api } from "@/lib/api/client";

export type AutomationStatus = "active" | "paused" | "draft";
export type RunStatus = "pending" | "running" | "success" | "failed" | "cancelled";
export type AutomationPlatform = "social" | "email" | "support" | "crm";

export interface Automation {
  id: string;
  name: string;
  description?: string;
  status: AutomationStatus;
  platform: AutomationPlatform;
  cron_expression: string;
  config: Record<string, unknown>;
  integration_id?: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  last_run_at?: string;
  next_run_at?: string;
  run_count: number;
}

export interface AutomationRun {
  id: string;
  automation_id: string;
  status: RunStatus;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  result?: {
    success: boolean;
    message: string;
    data?: Record<string, unknown>;
  };
  error?: string;
  tokens_used?: number;
}

export interface CreateAutomationPayload {
  name: string;
  description?: string;
  platform: AutomationPlatform;
  cron_expression: string;
  config: Record<string, unknown>;
  integration_id?: string;
}

export interface UpdateAutomationPayload {
  name?: string;
  description?: string;
  cron_expression?: string;
  config?: Record<string, unknown>;
  integration_id?: string;
}

export interface PaginatedRuns {
  items: AutomationRun[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export function listAutomations(): Promise<Automation[]> {
  return api.get<Automation[]>("/automations");
}

export function getAutomation(id: string): Promise<Automation> {
  return api.get<Automation>(`/automations/${id}`);
}

export function createAutomation(payload: CreateAutomationPayload): Promise<Automation> {
  return api.post<Automation>("/automations", payload);
}

export function updateAutomation(id: string, payload: UpdateAutomationPayload): Promise<Automation> {
  return api.patch<Automation>(`/automations/${id}`, payload);
}

export function deleteAutomation(id: string): Promise<void> {
  return api.delete<void>(`/automations/${id}`);
}

export function toggleAutomation(id: string): Promise<Automation> {
  return api.post<Automation>(`/automations/${id}/toggle`);
}

export function triggerAutomation(id: string): Promise<AutomationRun> {
  return api.post<AutomationRun>(`/automations/${id}/run`);
}

export function listAutomationRuns(
  automationId: string,
  params?: { limit?: number; offset?: number },
): Promise<PaginatedRuns> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const qs = q.toString();
  return api.get<PaginatedRuns>(`/automations/${automationId}/runs${qs ? `?${qs}` : ""}`);
}

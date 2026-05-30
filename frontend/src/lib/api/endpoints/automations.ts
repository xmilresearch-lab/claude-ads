import { api } from "@/lib/api/client";
import type { AutomationResponse, AutomationRunResponse } from "@/lib/api/types";

export interface CreateAutomationPayload {
  name: string;
  type: string;
  config?: Record<string, unknown>;
  schedule?: string | null;
}

export interface UpdateAutomationPayload extends Partial<CreateAutomationPayload> {
  active?: boolean;
}

export interface ListParams {
  limit?: number;
  offset?: number;
}

export function listAutomations(params: ListParams = {}): Promise<AutomationResponse[]> {
  const q = new URLSearchParams();
  if (params.limit) q.set("limit", String(params.limit));
  if (params.offset) q.set("offset", String(params.offset));
  return api.get<AutomationResponse[]>(`/automations?${q}`);
}

export function getAutomation(id: string): Promise<AutomationResponse> {
  return api.get<AutomationResponse>(`/automations/${id}`);
}

export function createAutomation(payload: CreateAutomationPayload): Promise<AutomationResponse> {
  return api.post<AutomationResponse>("/automations", payload);
}

export function updateAutomation(id: string, payload: UpdateAutomationPayload): Promise<AutomationResponse> {
  return api.patch<AutomationResponse>(`/automations/${id}`, payload);
}

export function deleteAutomation(id: string): Promise<void> {
  return api.delete(`/automations/${id}`);
}

export function triggerAutomation(id: string, payload?: Record<string, unknown>): Promise<{ run_id: string; status: string }> {
  return api.post(`/automations/${id}/run`, payload ?? {});
}

export function listRuns(id: string, params: ListParams = {}): Promise<AutomationRunResponse[]> {
  const q = new URLSearchParams();
  if (params.limit) q.set("limit", String(params.limit));
  if (params.offset) q.set("offset", String(params.offset));
  return api.get<AutomationRunResponse[]>(`/automations/${id}/runs?${q}`);
}

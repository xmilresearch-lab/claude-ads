import { api } from "@/lib/api/client";
import type { IntegrationResponse } from "@/lib/api/types";

export function listIntegrations(): Promise<IntegrationResponse[]> {
  return api.get<IntegrationResponse[]>("/integrations");
}

export function getIntegration(id: string): Promise<IntegrationResponse> {
  return api.get<IntegrationResponse>(`/integrations/${id}`);
}

export function initiateOAuth(type: string): Promise<{ auth_url: string }> {
  return api.post<{ auth_url: string }>("/integrations/oauth/initiate", { type });
}

export function callbackOAuth(code: string, state: string): Promise<IntegrationResponse> {
  return api.post<IntegrationResponse>("/integrations/oauth/callback", { code, state });
}

export function connectApiKey(type: string, api_key: string): Promise<IntegrationResponse> {
  return api.post<IntegrationResponse>("/integrations/api-key", { type, api_key });
}

export function deleteIntegration(id: string): Promise<void> {
  return api.delete(`/integrations/${id}`);
}

export function checkIntegrationHealth(id: string): Promise<{ status: string; detail?: string }> {
  return api.get(`/integrations/${id}/health`);
}

import { api } from "@/lib/api/client";

export interface Integration {
  id: string;
  provider: string;
  status: "active" | "expiring" | "error" | "disconnected";
  display_name: string;
  connected_at: string;
  expires_at?: string;
  extra?: Record<string, string>;
}

export async function listIntegrations(): Promise<Integration[]> {
  return api.get<Integration[]>("/integrations");
}

export async function initiateOAuth(provider: string): Promise<{ authorization_url: string }> {
  return api.post<{ authorization_url: string }>("/integrations/oauth/initiate", { provider });
}

export async function completeOAuth(params: {
  provider: string;
  code: string;
  state: string;
}): Promise<Integration> {
  return api.post<Integration>("/integrations/oauth/callback", params);
}

export async function connectApiKey(params: {
  provider: string;
  api_key: string;
  extra_fields?: Record<string, string>;
}): Promise<Integration> {
  return api.post<Integration>("/integrations/api-key", params);
}

export async function checkIntegrationHealth(integrationId: string): Promise<{
  status: "healthy" | "expiring" | "error";
  message?: string;
  expires_at?: string;
}> {
  return api.get(`/integrations/${integrationId}/health`);
}

export async function disconnectIntegration(integrationId: string): Promise<void> {
  return api.delete(`/integrations/${integrationId}`);
}

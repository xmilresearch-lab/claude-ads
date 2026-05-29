"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listIntegrations,
  initiateOAuth,
  connectApiKey,
  checkIntegrationHealth,
  disconnectIntegration,
  type Integration,
} from "@/lib/api/integrations";

export const integrationKeys = {
  all: ["integrations"] as const,
  list: () => [...integrationKeys.all, "list"] as const,
  health: (id: string) => [...integrationKeys.all, "health", id] as const,
};

export function useIntegrations() {
  return useQuery({
    queryKey: integrationKeys.list(),
    queryFn: listIntegrations,
    staleTime: 30_000,
  });
}

export function useIntegrationStatus(integration: Integration | undefined) {
  return useQuery({
    queryKey: integrationKeys.health(integration?.id ?? ""),
    queryFn: () => checkIntegrationHealth(integration!.id),
    enabled: !!integration && integration.status !== "disconnected",
    refetchInterval: 60_000,
    staleTime: 55_000,
  });
}

export function useInitiateOAuth() {
  return useMutation({
    mutationFn: (provider: string) => initiateOAuth(provider),
    onSuccess: ({ authorization_url }) => {
      window.location.href = authorization_url;
    },
  });
}

export function useConnectApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: connectApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.list() });
    },
  });
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disconnectIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.list() });
    },
  });
}

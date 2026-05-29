"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAutomations,
  getAutomation,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomation,
  triggerAutomation,
  listAutomationRuns,
  type CreateAutomationPayload,
  type UpdateAutomationPayload,
  type AutomationRun,
} from "@/lib/api/automations";

export const automationKeys = {
  all: ["automations"] as const,
  list: () => [...automationKeys.all, "list"] as const,
  detail: (id: string) => [...automationKeys.all, "detail", id] as const,
  runs: (id: string) => [...automationKeys.all, "runs", id] as const,
};

export function useAutomations() {
  return useQuery({
    queryKey: automationKeys.list(),
    queryFn: listAutomations,
    staleTime: 30_000,
  });
}

export function useAutomation(id: string) {
  return useQuery({
    queryKey: automationKeys.detail(id),
    queryFn: () => getAutomation(id),
    enabled: !!id,
    staleTime: 15_000,
  });
}

const ACTIVE_STATUSES = new Set<AutomationRun["status"]>(["pending", "running"]);

export function useAutomationRuns(automationId: string, enabled = true) {
  return useQuery({
    queryKey: automationKeys.runs(automationId),
    queryFn: () => listAutomationRuns(automationId, { limit: 10 }),
    enabled: enabled && !!automationId,
    staleTime: 2_000,
    refetchInterval: (query) => {
      const runs = query.state.data?.items ?? [];
      const hasActiveRun = runs.some((r) => ACTIVE_STATUSES.has(r.status));
      return hasActiveRun ? 3_000 : false;
    },
  });
}

export function useCreateAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAutomationPayload) => createAutomation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.list() });
    },
  });
}

export function useUpdateAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAutomationPayload }) =>
      updateAutomation(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: automationKeys.list() });
      queryClient.invalidateQueries({ queryKey: automationKeys.detail(id) });
    },
  });
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAutomation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeys.list() });
    },
  });
}

export function useToggleAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleAutomation(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: automationKeys.list() });
      queryClient.setQueryData(automationKeys.detail(updated.id), updated);
    },
  });
}

export function useTriggerAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => triggerAutomation(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: automationKeys.runs(id) });
    },
  });
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  triggerAutomation,
  listRuns,
  type CreateAutomationPayload,
  type UpdateAutomationPayload,
} from "@/lib/api/endpoints/automations";
import { ApiError } from "@/lib/api/client";
import { toast } from "sonner";
import type { AutomationResponse } from "@/lib/api/types";

export const AUTOMATIONS_KEY = ["automations"] as const;
export const automationKey = (id: string) => ["automations", id] as const;
export const runsKey = (id: string) => ["automations", id, "runs"] as const;

export function useAutomations() {
  return useQuery({
    queryKey: AUTOMATIONS_KEY,
    queryFn: () => listAutomations({ limit: 100 }),
    staleTime: 30_000,
  });
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAutomationPayload) => createAutomation(payload),
    onSuccess: (data) => {
      qc.setQueryData<AutomationResponse[]>(AUTOMATIONS_KEY, (prev = []) => [data, ...prev]);
      toast.success("Automation created");
    },
    onError: (err: Error) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to create automation"),
  });
}

export function useUpdateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAutomationPayload }) =>
      updateAutomation(id, payload),
    onSuccess: (data) => {
      qc.setQueryData<AutomationResponse[]>(AUTOMATIONS_KEY, (prev = []) =>
        prev.map((a) => (a.id === data.id ? data : a)),
      );
      qc.setQueryData(automationKey(data.id), data);
      toast.success("Automation updated");
    },
    onError: (err: Error) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to update automation"),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAutomation(id),
    onSuccess: (_, id) => {
      qc.setQueryData<AutomationResponse[]>(AUTOMATIONS_KEY, (prev = []) =>
        prev.filter((a) => a.id !== id),
      );
      toast.success("Automation deleted");
    },
    onError: (err: Error) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to delete automation"),
  });
}

export function useToggleAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateAutomation(id, { active }),
    onSuccess: (data) => {
      qc.setQueryData<AutomationResponse[]>(AUTOMATIONS_KEY, (prev = []) =>
        prev.map((a) => (a.id === data.id ? data : a)),
      );
      toast.success(data.active ? "Automation activated" : "Automation paused");
    },
    onError: (err: Error) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to update automation"),
  });
}

export function useTriggerAutomation() {
  return useMutation({
    mutationFn: (id: string) => triggerAutomation(id),
    onSuccess: () => toast.success("Run triggered"),
    onError: (err: Error) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to trigger run"),
  });
}

export function useRunHistory(id: string, enabled = false) {
  return useQuery({
    queryKey: runsKey(id),
    queryFn: () => listRuns(id, { limit: 10 }),
    staleTime: 15_000,
    enabled,
  });
}

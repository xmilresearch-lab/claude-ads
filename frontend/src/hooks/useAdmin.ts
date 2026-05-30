"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAdminUsers,
  suspendUser,
  unsuspendUser,
  listAdminWorkspaces,
  getSystemHealth,
  getAdminTokenUsage,
  type AdminUsersParams,
} from "@/lib/api/admin";

export interface AdminWorkspacesParams {
  search?: string;
  limit?: number;
  offset?: number;
}

export const adminKeys = {
  all: ["admin"] as const,
  users: (params: AdminUsersParams) => [...adminKeys.all, "users", params] as const,
  workspaces: (params?: AdminWorkspacesParams) => [...adminKeys.all, "workspaces", params] as const,
  health: () => [...adminKeys.all, "health"] as const,
  tokens: () => [...adminKeys.all, "tokens"] as const,
};

export function useAdminUsers(params: AdminUsersParams = {}) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn: () => listAdminUsers(params),
    staleTime: 30_000,
  });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      suspendUser(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useUnsuspendUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unsuspendUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useAdminWorkspaces(params?: AdminWorkspacesParams) {
  return useQuery({
    queryKey: adminKeys.workspaces(params),
    queryFn: () => listAdminWorkspaces(params),
    staleTime: 30_000,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: adminKeys.health(),
    queryFn: getSystemHealth,
    staleTime: 25_000,
    refetchInterval: 30_000,
  });
}

export function useAdminTokenUsage() {
  return useQuery({
    queryKey: adminKeys.tokens(),
    queryFn: getAdminTokenUsage,
    staleTime: 60_000,
  });
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspacesApi } from "@/lib/api/endpoints/workspaces";
import { ApiError } from "@/lib/api/client";
import { toast } from "sonner";

export const WORKSPACE_KEY = ["workspace", "me"] as const;
export const BRAND_VOICE_KEY = ["workspace", "brand-voice"] as const;
export const SETTINGS_KEY = ["workspace", "settings"] as const;

export function useWorkspace() {
  return useQuery({
    queryKey: WORKSPACE_KEY,
    queryFn: workspacesApi.getMe,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBrandVoice() {
  return useQuery({
    queryKey: BRAND_VOICE_KEY,
    queryFn: workspacesApi.getBrandVoice,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workspacesApi.updateMe,
    onSuccess: (data) => {
      qc.setQueryData(WORKSPACE_KEY, data);
      toast.success("Workspace updated");
    },
    onError: (err: Error) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to update workspace"),
  });
}

export function useSetBrandVoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workspacesApi.setBrandVoice,
    onSuccess: (data) => {
      qc.setQueryData(BRAND_VOICE_KEY, data);
      qc.invalidateQueries({ queryKey: WORKSPACE_KEY });
      toast.success("Brand voice saved");
    },
    onError: (err: Error) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to save brand voice"),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workspacesApi.updateSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WORKSPACE_KEY });
      toast.success("Settings saved");
    },
    onError: (err: Error) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to save settings"),
  });
}

export function useDeleteBrandVoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workspacesApi.deleteBrandVoice,
    onSuccess: () => {
      qc.setQueryData(BRAND_VOICE_KEY, null);
      qc.invalidateQueries({ queryKey: WORKSPACE_KEY });
      toast.success("Brand voice removed");
    },
    onError: (err: Error) =>
      toast.error(err instanceof ApiError ? err.message : "Failed to remove brand voice"),
  });
}

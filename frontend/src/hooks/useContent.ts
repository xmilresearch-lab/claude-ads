"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listContent,
  getContentItem,
  approveContent,
  rejectContent,
  editContent,
  bulkApprove,
  bulkReject,
  type ContentListParams,
} from "@/lib/api/content";

export const contentKeys = {
  all: ["content"] as const,
  list: (params: ContentListParams) => [...contentKeys.all, "list", params] as const,
  detail: (id: string) => [...contentKeys.all, "detail", id] as const,
};

export function useContent(params: ContentListParams = {}) {
  return useQuery({
    queryKey: contentKeys.list(params),
    queryFn: () => listContent(params),
    staleTime: 5_000,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      if (items.some((i) => i.status === "publishing")) return 5_000;
      if (
        !params.status ||
        params.status === "all" ||
        params.status === "pending_review"
      ) {
        return 10_000;
      }
      return false;
    },
  });
}

export function useContentItem(id: string) {
  return useQuery({
    queryKey: contentKeys.detail(id),
    queryFn: () => getContentItem(id),
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useApproveContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveContent(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(contentKeys.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: contentKeys.all });
    },
  });
}

export function useRejectContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      rejectContent(id, reason),
    onSuccess: (updated) => {
      queryClient.setQueryData(contentKeys.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: contentKeys.all });
    },
  });
}

export function useEditContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      editContent(id, content),
    onSuccess: (updated) => {
      queryClient.setQueryData(contentKeys.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: contentKeys.all });
    },
  });
}

export function useBulkApprove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkApprove(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentKeys.all });
    },
  });
}

export function useBulkReject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, reason }: { ids: string[]; reason?: string }) =>
      bulkReject(ids, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contentKeys.all });
    },
  });
}

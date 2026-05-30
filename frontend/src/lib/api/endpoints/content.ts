import { api } from "@/lib/api/client";
import type { ContentQueueItem } from "@/lib/api/types";

export interface ListContentParams {
  status?: string;
  limit?: number;
  offset?: number;
}

export function listContent(params: ListContentParams = {}): Promise<ContentQueueItem[]> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.limit) q.set("limit", String(params.limit));
  if (params.offset) q.set("offset", String(params.offset));
  return api.get<ContentQueueItem[]>(`/content/queue?${q}`);
}

export function getContentItem(id: string): Promise<ContentQueueItem> {
  return api.get<ContentQueueItem>(`/content/${id}`);
}

export function approveContent(id: string): Promise<ContentQueueItem> {
  return api.patch<ContentQueueItem>(`/content/${id}/approve`);
}

export function rejectContent(id: string, reason?: string): Promise<ContentQueueItem> {
  return api.patch<ContentQueueItem>(`/content/${id}/reject`, { reason });
}

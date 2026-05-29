import { api } from "@/lib/api/client";

export type ContentStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "publishing"
  | "published"
  | "failed";

export type ContentPlatform =
  | "twitter"
  | "linkedin"
  | "instagram"
  | "gmail"
  | "sendgrid";

export interface ContentItem {
  id: string;
  automation_id: string;
  automation_name: string;
  platform: ContentPlatform;
  status: ContentStatus;
  content: string;
  metadata?: {
    subject?: string;
    scheduled_for?: string;
    hashtags?: string[];
    media_urls?: string[];
    recipient?: string;
  };
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  publish_error?: string;
  tokens_used?: number;
  created_at: string;
  updated_at: string;
}

export interface ContentListParams {
  status?: ContentStatus | "all";
  platform?: ContentPlatform | "all";
  limit?: number;
  offset?: number;
}

export interface PaginatedContent {
  items: ContentItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface BulkActionResult {
  succeeded: string[];
  failed: string[];
}

export function listContent(params?: ContentListParams): Promise<PaginatedContent> {
  const q = new URLSearchParams();
  if (params?.status && params.status !== "all") q.set("status", params.status);
  if (params?.platform && params.platform !== "all") q.set("platform", params.platform);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const qs = q.toString();
  return api.get<PaginatedContent>(`/content${qs ? `?${qs}` : ""}`);
}

export function getContentItem(id: string): Promise<ContentItem> {
  return api.get<ContentItem>(`/content/${id}`);
}

export function approveContent(id: string): Promise<ContentItem> {
  return api.post<ContentItem>(`/content/${id}/approve`);
}

export function rejectContent(id: string, reason?: string): Promise<ContentItem> {
  return api.post<ContentItem>(`/content/${id}/reject`, { reason });
}

export function editContent(id: string, content: string): Promise<ContentItem> {
  return api.patch<ContentItem>(`/content/${id}`, { content });
}

export function bulkApprove(ids: string[]): Promise<BulkActionResult> {
  return api.post<BulkActionResult>("/content/bulk/approve", { ids });
}

export function bulkReject(ids: string[], reason?: string): Promise<BulkActionResult> {
  return api.post<BulkActionResult>("/content/bulk/reject", { ids, reason });
}

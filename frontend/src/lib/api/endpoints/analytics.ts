import { api } from "@/lib/api/client";
import type {
  AnalyticsOverview,
  AutomationBreakdown,
  PlatformStats,
  TokenUsageSeries,
} from "@/lib/api/types";

export function getOverview(days = 30): Promise<AnalyticsOverview> {
  return api.get<AnalyticsOverview>(`/analytics/overview?days=${days}`);
}

export function getTokenUsage(days = 30): Promise<TokenUsageSeries[]> {
  return api.get<TokenUsageSeries[]>(`/analytics/tokens?days=${days}`);
}

export function getPlatformStats(): Promise<PlatformStats[]> {
  return api.get<PlatformStats[]>("/analytics/platforms");
}

export function getAutomationBreakdown(params: { days?: number; limit?: number; offset?: number } = {}): Promise<AutomationBreakdown[]> {
  const q = new URLSearchParams();
  if (params.days) q.set("days", String(params.days));
  if (params.limit) q.set("limit", String(params.limit));
  if (params.offset) q.set("offset", String(params.offset));
  return api.get<AutomationBreakdown[]>(`/analytics/automations?${q}`);
}

export function exportAnalytics(format: "csv" | "json" = "csv"): Promise<Blob> {
  return fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/export?format=${format}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("__at") ?? ""}` },
  }).then((r) => r.blob());
}

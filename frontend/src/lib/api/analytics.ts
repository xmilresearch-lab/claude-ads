import { api } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/tokens";
import { API_URL } from "@/lib/utils/constants";
import { format } from "date-fns";

export type DateRange = "7d" | "30d" | "90d";

export interface AnalyticsOverview {
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  success_rate: number;
  total_tokens: number;
  estimated_cost_usd: number;
  active_automations: number;
  items_published: number;
  items_pending_review: number;
  avg_run_duration_ms: number;
}

export interface AutomationStat {
  automation_id: string;
  automation_name: string;
  platform: string;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  tokens_used: number;
  last_run_at?: string;
}

export interface PlatformStat {
  platform: string;
  published_count: number;
  pending_count: number;
  failed_count: number;
  total_tokens: number;
}

export interface TokenDataPoint {
  date: string;
  tokens_used: number;
  run_count: number;
  estimated_cost_usd: number;
}

export interface RunDataPoint {
  date: string;
  successful: number;
  failed: number;
  total: number;
}

export function getAnalyticsOverview(range: DateRange): Promise<AnalyticsOverview> {
  return api.get<AnalyticsOverview>(`/analytics/overview?range=${range}`);
}

export function getAutomationStats(range: DateRange): Promise<AutomationStat[]> {
  return api.get<AutomationStat[]>(`/analytics/automations?range=${range}`);
}

export function getPlatformStats(range: DateRange): Promise<PlatformStat[]> {
  return api.get<PlatformStat[]>(`/analytics/platforms?range=${range}`);
}

export function getTokenTimeSeries(range: DateRange): Promise<TokenDataPoint[]> {
  return api.get<TokenDataPoint[]>(`/analytics/tokens?range=${range}`);
}

export function getRunTimeSeries(range: DateRange): Promise<RunDataPoint[]> {
  return api.get<RunDataPoint[]>(`/analytics/runs?range=${range}`);
}

export async function exportAnalyticsCSV(range: DateRange): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}/analytics/export?range=${range}`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analytics-${range}-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

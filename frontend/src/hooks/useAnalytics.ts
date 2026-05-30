"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getAnalyticsOverview,
  getAutomationStats,
  getPlatformStats,
  getTokenTimeSeries,
  getRunTimeSeries,
  exportAnalyticsCSV,
  type DateRange,
} from "@/lib/api/analytics";

export const analyticsKeys = {
  all: ["analytics"] as const,
  overview: (range: DateRange) => [...analyticsKeys.all, "overview", range] as const,
  automations: (range: DateRange) => [...analyticsKeys.all, "automations", range] as const,
  platforms: (range: DateRange) => [...analyticsKeys.all, "platforms", range] as const,
  tokens: (range: DateRange) => [...analyticsKeys.all, "tokens", range] as const,
  runs: (range: DateRange) => [...analyticsKeys.all, "runs", range] as const,
};

const STALE_TIME = 5 * 60 * 1000;

export function useAnalyticsOverview(range: DateRange) {
  return useQuery({
    queryKey: analyticsKeys.overview(range),
    queryFn: () => getAnalyticsOverview(range),
    staleTime: STALE_TIME,
  });
}

export function useAutomationStats(range: DateRange) {
  return useQuery({
    queryKey: analyticsKeys.automations(range),
    queryFn: () => getAutomationStats(range),
    staleTime: STALE_TIME,
  });
}

export function usePlatformStats(range: DateRange) {
  return useQuery({
    queryKey: analyticsKeys.platforms(range),
    queryFn: () => getPlatformStats(range),
    staleTime: STALE_TIME,
  });
}

export function useTokenTimeSeries(range: DateRange) {
  return useQuery({
    queryKey: analyticsKeys.tokens(range),
    queryFn: () => getTokenTimeSeries(range),
    staleTime: STALE_TIME,
  });
}

export function useRunTimeSeries(range: DateRange) {
  return useQuery({
    queryKey: analyticsKeys.runs(range),
    queryFn: () => getRunTimeSeries(range),
    staleTime: STALE_TIME,
  });
}

export function useExportCSV() {
  return useMutation({
    mutationFn: (range: DateRange) => exportAnalyticsCSV(range),
  });
}

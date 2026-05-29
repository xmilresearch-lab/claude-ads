import type { DateRange } from "@/lib/api/analytics";
import { subDays, format, eachDayOfInterval } from "date-fns";

export interface DateRangeOption {
  value: DateRange;
  label: string;
  days: number;
}

export const DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { value: "7d",  label: "Last 7 days",  days: 7  },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
];

export function buildDateAxis(range: DateRange): string[] {
  const days = DATE_RANGE_OPTIONS.find((o) => o.value === range)?.days ?? 30;
  const end = new Date();
  const start = subDays(end, days - 1);
  return eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));
}

export function fillTimeSeries<T extends { date: string }>(
  data: T[],
  range: DateRange,
  defaults: Omit<T, "date">,
): T[] {
  const axis = buildDateAxis(range);
  const dataMap = new Map(data.map((d) => [d.date, d]));
  return axis.map((date) => dataMap.get(date) ?? ({ date, ...defaults } as T));
}

export function formatAxisDate(dateStr: string, range: DateRange): string {
  const date = new Date(dateStr + "T00:00:00");
  if (range === "7d") return format(date, "EEE d");
  return format(date, "MMM d");
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatCost(usd: number): string {
  if (usd < 0.01) return "<$0.01";
  return `$${usd.toFixed(2)}`;
}

export function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60_000)}m`;
}

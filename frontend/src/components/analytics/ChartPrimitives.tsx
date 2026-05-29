"use client";

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatter?: (value: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0D0E14] border border-[#1E2330] rounded-[4px] px-3 py-2 shadow-xl">
      {label && (
        <p className="text-[10px] font-mono text-[#6B7280] mb-1.5">{label}</p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs font-mono">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[#9CA3AF]">{entry.name}:</span>
          <span className="text-white">
            {formatter
              ? formatter(entry.value, entry.name)
              : entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export const CHART_COLORS = {
  cyan:    "#06B6D4",
  amber:   "#F59E0B",
  violet:  "#8B5CF6",
  emerald: "#10B981",
  rose:    "#F43F5E",
  gray:    "#374151",
} as const;

export const xAxisProps = {
  tick: { fill: "#6B7280", fontSize: 10, fontFamily: "DM Mono, monospace" },
  axisLine: { stroke: "#1E2330" },
  tickLine: false,
} as const;

export const yAxisProps = {
  tick: { fill: "#6B7280", fontSize: 10, fontFamily: "DM Mono, monospace" },
  axisLine: false,
  tickLine: false,
  width: 45,
} as const;

export const gridProps = {
  strokeDasharray: "3 3",
  stroke: "#1E2330",
  vertical: false,
} as const;

export function ChartEmpty({ message = "No data for this period" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-xs font-mono text-[#374151]">{message}</p>
    </div>
  );
}

export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      className="w-full rounded-[4px] bg-[#0D0E14] animate-pulse"
      style={{ height }}
    />
  );
}

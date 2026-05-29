"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  ChartTooltip,
  ChartSkeleton,
  ChartEmpty,
  CHART_COLORS,
  xAxisProps,
  yAxisProps,
  gridProps,
} from "./ChartPrimitives";
import { fillTimeSeries, formatAxisDate } from "@/lib/analytics/dateRange";
import type { RunDataPoint, DateRange } from "@/lib/api/analytics";

interface RunTrendChartProps {
  data: RunDataPoint[];
  range: DateRange;
  isLoading?: boolean;
}

export function RunTrendChart({ data, range, isLoading }: RunTrendChartProps) {
  const chartData = useMemo(() => {
    const filled = fillTimeSeries(data, range, { successful: 0, failed: 0, total: 0 });
    return filled.map((d) => ({
      ...d,
      label: formatAxisDate(d.date, range),
    }));
  }, [data, range]);

  const isEmpty = chartData.every((d) => d.successful === 0 && d.failed === 0);

  const tickInterval =
    range === "7d" ? 0 : range === "30d" ? 4 : 13;

  if (isLoading) return <ChartSkeleton height={220} />;
  if (isEmpty) return <div style={{ height: 220 }}><ChartEmpty /></div>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" {...xAxisProps} interval={tickInterval} />
        <YAxis
          {...yAxisProps}
          tickFormatter={(v: number) => (v === 0 ? "0" : `${v}`)}
        />
        <Tooltip
          content={<ChartTooltip formatter={(v) => v.toLocaleString()} />}
        />
        <Legend
          wrapperStyle={{
            fontSize: "10px",
            fontFamily: "DM Mono, monospace",
            color: "#6B7280",
            paddingTop: "8px",
          }}
        />
        <Area
          type="monotone"
          dataKey="successful"
          name="Successful"
          fill={CHART_COLORS.cyan}
          stroke={CHART_COLORS.cyan}
          fillOpacity={0.15}
          strokeWidth={1.5}
          stackId="runs"
        />
        <Area
          type="monotone"
          dataKey="failed"
          name="Failed"
          fill={CHART_COLORS.rose}
          stroke={CHART_COLORS.rose}
          fillOpacity={0.15}
          strokeWidth={1.5}
          stackId="runs"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

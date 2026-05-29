"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
import {
  fillTimeSeries,
  formatAxisDate,
  formatNumber,
  formatCost,
} from "@/lib/analytics/dateRange";
import type { TokenDataPoint, DateRange } from "@/lib/api/analytics";

interface TokenUsageChartProps {
  data: TokenDataPoint[];
  range: DateRange;
  isLoading?: boolean;
}

export function TokenUsageChart({ data, range, isLoading }: TokenUsageChartProps) {
  const chartData = useMemo(() => {
    const filled = fillTimeSeries(data, range, {
      tokens_used: 0,
      run_count: 0,
      estimated_cost_usd: 0,
    });
    return filled.map((d) => ({
      ...d,
      label: formatAxisDate(d.date, range),
    }));
  }, [data, range]);

  const isEmpty = chartData.every((d) => d.tokens_used === 0);

  const tickInterval =
    range === "7d" ? 0 : range === "30d" ? 4 : 13;

  if (isLoading) return <ChartSkeleton height={220} />;
  if (isEmpty) return <div style={{ height: 220 }}><ChartEmpty /></div>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" {...xAxisProps} interval={tickInterval} />
        <YAxis
          {...yAxisProps}
          tickFormatter={(v: number) => formatNumber(v)}
        />
        <YAxis
          yAxisId="cost"
          orientation="right"
          {...yAxisProps}
          width={50}
          tickFormatter={(v: number) => formatCost(v)}
        />
        <Tooltip
          content={
            <ChartTooltip
              formatter={(v, name) => {
                if (name === "Est. Cost") return formatCost(v);
                return `${formatNumber(v)} tokens`;
              }}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="tokens_used"
          name="Tokens"
          stroke={CHART_COLORS.cyan}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: CHART_COLORS.cyan }}
        />
        <Line
          type="monotone"
          dataKey="estimated_cost_usd"
          name="Est. Cost"
          stroke={CHART_COLORS.amber}
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="4 2"
          yAxisId="cost"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
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
  gridProps,
  xAxisProps,
} from "./ChartPrimitives";
import { CONTENT_PLATFORM_CONFIG } from "@/lib/content/config";
import type { PlatformStat } from "@/lib/api/analytics";
import type { ContentPlatform } from "@/lib/api/content";

interface PlatformChartProps {
  data: PlatformStat[];
  isLoading?: boolean;
}

export function PlatformChart({ data, isLoading }: PlatformChartProps) {
  const chartData = useMemo(() => {
    return data
      .filter((d) => d.published_count + d.pending_count + d.failed_count > 0)
      .map((d) => ({
        name:
          CONTENT_PLATFORM_CONFIG[d.platform as ContentPlatform]?.label ??
          d.platform,
        published: d.published_count,
        pending: d.pending_count,
        failed: d.failed_count,
      }));
  }, [data]);

  if (isLoading) return <ChartSkeleton height={Math.max(180, 5 * 48)} />;
  if (chartData.length === 0) {
    return (
      <div style={{ height: 180 }}>
        <ChartEmpty message="No content published yet" />
      </div>
    );
  }

  const height = Math.max(180, chartData.length * 48);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
      >
        <CartesianGrid {...gridProps} horizontal={false} vertical={true} />
        <XAxis type="number" {...xAxisProps} />
        <YAxis
          type="category"
          dataKey="name"
          width={72}
          tick={{ fill: "#9CA3AF", fontSize: 10, fontFamily: "DM Mono, monospace" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar
          dataKey="published"
          name="Published"
          fill={CHART_COLORS.cyan}
          stackId="platform"
          radius={[0, 3, 3, 0]}
        />
        <Bar
          dataKey="pending"
          name="Pending"
          fill={CHART_COLORS.amber}
          stackId="platform"
          radius={[0, 3, 3, 0]}
        />
        <Bar
          dataKey="failed"
          name="Failed"
          fill={CHART_COLORS.rose}
          stackId="platform"
          radius={[0, 3, 3, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

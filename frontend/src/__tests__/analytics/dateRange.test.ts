import { describe, it, expect } from "vitest";
import {
  buildDateAxis,
  fillTimeSeries,
  formatNumber,
  formatCost,
} from "@/lib/analytics/dateRange";

describe("buildDateAxis", () => {
  it("returns 7 dates for 7d range", () => {
    const axis = buildDateAxis("7d");
    expect(axis).toHaveLength(7);
  });

  it("returns 30 dates for 30d range", () => {
    expect(buildDateAxis("30d")).toHaveLength(30);
  });

  it("last date is today in YYYY-MM-DD format", () => {
    const axis = buildDateAxis("7d");
    const today = new Date().toISOString().slice(0, 10);
    expect(axis[axis.length - 1]).toBe(today);
  });
});

describe("fillTimeSeries", () => {
  it("fills missing dates with defaults", () => {
    const today = new Date().toISOString().slice(0, 10);
    const sparse = [
      {
        date: today,
        tokens_used: 500,
        run_count: 3,
        estimated_cost_usd: 0.01,
      },
    ];
    const filled = fillTimeSeries(sparse, "7d", {
      tokens_used: 0,
      run_count: 0,
      estimated_cost_usd: 0,
    });
    expect(filled).toHaveLength(7);
    const nonToday = filled.filter((d) => d.tokens_used === 0);
    expect(nonToday.length).toBe(6);
  });
});

describe("formatNumber", () => {
  it("formats thousands with K suffix", () => {
    expect(formatNumber(1500)).toBe("1.5K");
  });

  it("formats millions with M suffix", () => {
    expect(formatNumber(2_400_000)).toBe("2.4M");
  });

  it("returns plain string for small numbers", () => {
    expect(formatNumber(42)).toBe("42");
  });
});

describe("formatCost", () => {
  it("returns <$0.01 for very small amounts", () => {
    expect(formatCost(0.001)).toBe("<$0.01");
  });
});

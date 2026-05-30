import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import { KpiCard } from "@/components/analytics/KpiCard";

describe("KpiCard", () => {
  it("renders label and value", () => {
    render(<KpiCard label="Total Runs" value="1.2K" />);
    expect(screen.getByText("Total Runs")).toBeInTheDocument();
    expect(screen.getByText("1.2K")).toBeInTheDocument();
  });

  it("renders positive trend in green", () => {
    render(<KpiCard label="Success Rate" value="94%" trend={12.4} />);
    expect(screen.getByText(/\+12\.4%/)).toBeInTheDocument();
    expect(screen.getByText("vs prev period")).toBeInTheDocument();
  });

  it("renders negative trend in red", () => {
    render(<KpiCard label="Failed Runs" value="3" trend={-5.2} />);
    expect(screen.getByText(/-5\.2%/)).toBeInTheDocument();
  });

  it("renders dash when trend is undefined", () => {
    render(<KpiCard label="Est. Cost" value="$0.12" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders loading skeleton when isLoading is true", () => {
    const { container } = render(<KpiCard label="Tokens" value="0" isLoading />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });
});

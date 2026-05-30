import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/useAdmin", () => ({
  useSystemHealth: vi.fn(),
  useAdminTokenUsage: vi.fn(),
}));

import { useSystemHealth, useAdminTokenUsage } from "@/hooks/useAdmin";
import AdminSystemPage from "@/app/(admin)/system/page";

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const mockHealth = {
  status: "healthy" as const,
  checked_at: "2024-01-15T10:00:00Z",
  services: [{ name: "PostgreSQL", status: "up" as const, latency_ms: 4 }],
  totals: {
    total_users: 100, total_workspaces: 50, total_automations: 200,
    total_runs_today: 30, total_tokens_today: 5000, queue_depth: 5,
  },
};

const mockTokenUsage = {
  today: 1000, this_month: 50000, estimated_cost_usd: 0.25,
  by_workspace: [{ workspace_name: "Acme Corp", tokens: 3000 }],
};

describe("AdminSystemPage", () => {
  beforeEach(() => {
    vi.mocked(useSystemHealth).mockReturnValue(
      { data: mockHealth, isLoading: false, isError: false, refetch: vi.fn() } as unknown as ReturnType<typeof useSystemHealth>,
    );
    vi.mocked(useAdminTokenUsage).mockReturnValue(
      { data: mockTokenUsage, isLoading: false } as unknown as ReturnType<typeof useAdminTokenUsage>,
    );
  });

  it("renders 'All systems operational' for healthy status", () => {
    render(<AdminSystemPage />, { wrapper: Wrapper });
    expect(screen.getByText(/all systems operational/i)).toBeInTheDocument();
  });

  it("renders 'Some services degraded' for degraded status", () => {
    vi.mocked(useSystemHealth).mockReturnValue(
      {
        data: { ...mockHealth, status: "degraded" as const },
        isLoading: false, isError: false, refetch: vi.fn(),
      } as unknown as ReturnType<typeof useSystemHealth>,
    );
    render(<AdminSystemPage />, { wrapper: Wrapper });
    expect(screen.getByText(/some services degraded/i)).toBeInTheDocument();
  });

  it("renders latency for each service card", () => {
    render(<AdminSystemPage />, { wrapper: Wrapper });
    expect(screen.getByText("4ms")).toBeInTheDocument();
  });

  it("renders queue depth in red when over 500", () => {
    vi.mocked(useSystemHealth).mockReturnValue(
      {
        data: { ...mockHealth, totals: { ...mockHealth.totals, queue_depth: 501 } },
        isLoading: false, isError: false, refetch: vi.fn(),
      } as unknown as ReturnType<typeof useSystemHealth>,
    );
    render(<AdminSystemPage />, { wrapper: Wrapper });
    const el = screen.getByText("501");
    expect(el.className).toContain("text-red-400");
  });
});

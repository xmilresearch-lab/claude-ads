import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/useAuditLog", () => ({
  useAuditLog: vi.fn(),
  useExportAuditLog: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { useAuditLog } from "@/hooks/useAuditLog";
import AuditLogPage from "@/app/(dashboard)/audit/page";

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("AuditLogPage", () => {
  beforeEach(() => {
    vi.mocked(useAuditLog).mockReturnValue(
      { data: { items: [], total: 0, limit: 25, offset: 0, has_more: false }, isLoading: false } as unknown as ReturnType<typeof useAuditLog>,
    );
  });

  it("renders page title 'Audit Log'", () => {
    render(<AuditLogPage />, { wrapper: Wrapper });
    expect(screen.getByRole("heading", { name: /audit log/i })).toBeInTheDocument();
  });

  it("renders animate-pulse elements when isLoading", () => {
    vi.mocked(useAuditLog).mockReturnValue(
      { data: undefined, isLoading: true } as unknown as ReturnType<typeof useAuditLog>,
    );
    const { container } = render(<AuditLogPage />, { wrapper: Wrapper });
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders empty state when items is empty and not loading", () => {
    render(<AuditLogPage />, { wrapper: Wrapper });
    expect(screen.getByText(/no audit log entries found/i)).toBeInTheDocument();
  });

  it("renders action pill for an audit entry", () => {
    vi.mocked(useAuditLog).mockReturnValue(
      {
        data: {
          items: [{
            id: "1", action: "automation.triggered", resource_type: "automation",
            status: "success", created_at: "2024-01-15T10:00:00Z",
          }],
          total: 1, limit: 25, offset: 0, has_more: false,
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useAuditLog>,
    );
    render(<AuditLogPage />, { wrapper: Wrapper });
    const matches = screen.getAllByText("automation.triggered");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});

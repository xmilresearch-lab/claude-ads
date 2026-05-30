import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockMutate = vi.fn();

vi.mock("@/hooks/useAdmin", () => ({
  useAdminUsers: vi.fn(),
  useSuspendUser: () => ({ mutate: mockMutate, isPending: false }),
  useUnsuspendUser: () => ({ mutate: mockMutate, isPending: false }),
}));

import { useAdminUsers } from "@/hooks/useAdmin";
import AdminUsersPage from "@/app/(admin)/users/page";

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const mockUser = {
  id: "u1", name: "Alice Smith", email: "alice@example.com",
  plan: "pro" as const, status: "active" as const,
  workspace_id: "ws1", workspace_name: "Acme Corp",
  created_at: "2024-01-01T00:00:00Z", last_active_at: "2024-01-15T10:00:00Z",
  automation_count: 5, token_usage_30d: 12000,
};

describe("AdminUsersPage", () => {
  beforeEach(() => {
    vi.mocked(useAdminUsers).mockReturnValue(
      { data: { items: [mockUser], total: 1, has_more: false }, isLoading: false } as unknown as ReturnType<typeof useAdminUsers>,
    );
  });

  it("renders page title 'Users'", () => {
    render(<AdminUsersPage />, { wrapper: Wrapper });
    expect(screen.getByRole("heading", { name: /^users$/i })).toBeInTheDocument();
  });

  it("renders user name and email from mock data", () => {
    render(<AdminUsersPage />, { wrapper: Wrapper });
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  it("renders 'suspended' status badge for a suspended user", () => {
    vi.mocked(useAdminUsers).mockReturnValue(
      {
        data: { items: [{ ...mockUser, status: "suspended" as const }], total: 1, has_more: false },
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminUsers>,
    );
    render(<AdminUsersPage />, { wrapper: Wrapper });
    const matches = screen.getAllByText(/suspended/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'Suspend' action for active admin plan users", () => {
    vi.mocked(useAdminUsers).mockReturnValue(
      {
        data: { items: [{ ...mockUser, plan: "admin" as const }], total: 1, has_more: false },
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminUsers>,
    );
    render(<AdminUsersPage />, { wrapper: Wrapper });
    expect(screen.getByTitle("Suspend")).toBeInTheDocument();
  });
});

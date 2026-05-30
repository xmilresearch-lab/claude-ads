import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const mockBulkApprove = vi.fn();
const mockBulkReject = vi.fn();
vi.mock("@/hooks/useContent", () => ({
  useBulkApprove: () => ({ mutate: mockBulkApprove, isPending: false }),
  useBulkReject: () => ({ mutate: mockBulkReject, isPending: false }),
}));

import { BulkActionBar } from "@/components/content/BulkActionBar";

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("BulkActionBar", () => {
  it("is not visible/interactive when selectedIds is empty", () => {
    render(
      <Wrapper>
        <BulkActionBar selectedIds={[]} onClear={vi.fn()} />
      </Wrapper>,
    );
    // Approve all button is disabled (not enabled) when no items selected
    const approveBtn = screen.getByRole("button", { name: /approve all/i });
    expect(approveBtn).not.toBeEnabled();
  });

  it("shows selected count when ids are provided", () => {
    render(
      <Wrapper>
        <BulkActionBar selectedIds={["a", "b", "c"]} onClear={vi.fn()} />
      </Wrapper>,
    );
    const countEl = screen.getByTestId("selected-count");
    expect(countEl).toHaveTextContent("3");
  });

  it("calls onClear when Clear is clicked", () => {
    const onClear = vi.fn();
    render(
      <Wrapper>
        <BulkActionBar selectedIds={["a"]} onClear={onClear} />
      </Wrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

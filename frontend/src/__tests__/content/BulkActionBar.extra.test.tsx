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

describe("BulkActionBar — reject expand/collapse", () => {
  it("toggles reject panel when Reject all is clicked", () => {
    render(
      <Wrapper>
        <BulkActionBar selectedIds={["a", "b"]} onClear={vi.fn()} />
      </Wrapper>,
    );
    const rejectBtn = screen.getByRole("button", { name: /reject all/i });
    fireEvent.click(rejectBtn);
    // The rejection reason input should now be in the DOM
    expect(screen.getByPlaceholderText(/add a reason/i)).toBeInTheDocument();
  });

  it("shows singular 'item' in selected count for single selection", () => {
    render(
      <Wrapper>
        <BulkActionBar selectedIds={["a"]} onClear={vi.fn()} />
      </Wrapper>,
    );
    expect(screen.getByText(/item selected/)).toBeInTheDocument();
  });

  it("shows plural 'items' in selected count for multiple", () => {
    render(
      <Wrapper>
        <BulkActionBar selectedIds={["a", "b"]} onClear={vi.fn()} />
      </Wrapper>,
    );
    expect(screen.getByText(/items selected/)).toBeInTheDocument();
  });

  it("calls bulkApprove mutate when approve all is clicked", () => {
    render(
      <Wrapper>
        <BulkActionBar selectedIds={["a", "b"]} onClear={vi.fn()} />
      </Wrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: /approve all/i }));
    expect(mockBulkApprove).toHaveBeenCalledWith(
      ["a", "b"],
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("calls bulkReject mutate with ids and reason when reject button clicked", () => {
    render(
      <Wrapper>
        <BulkActionBar selectedIds={["x"]} onClear={vi.fn()} />
      </Wrapper>,
    );
    // Open reject panel
    fireEvent.click(screen.getByRole("button", { name: /reject all/i }));
    // Type a reason
    const input = screen.getByPlaceholderText(/add a reason/i);
    fireEvent.change(input, { target: { value: "Not aligned with brand" } });
    // Click reject button
    fireEvent.click(screen.getByRole("button", { name: /reject 1/i }));
    expect(mockBulkReject).toHaveBeenCalledWith(
      { ids: ["x"], reason: "Not aligned with brand" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
})

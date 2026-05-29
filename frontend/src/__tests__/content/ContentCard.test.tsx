import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import type { ContentItem } from "@/lib/api/content";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const mockApproveContent = vi.fn();
vi.mock("@/hooks/useContent", () => ({
  useApproveContent: () => ({
    mutate: mockApproveContent,
    isPending: false,
  }),
}));

import { ContentCard } from "@/components/content/ContentCard";

const makeContentItem = (overrides?: Partial<ContentItem>): ContentItem => ({
  id: "content-1",
  automation_id: "auto-1",
  automation_name: "Daily Social Post",
  platform: "twitter",
  status: "pending_review",
  content: "This is the generated tweet content for testing purposes.",
  tokens_used: 150,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("ContentCard", () => {
  it("renders automation name and content preview", () => {
    render(
      <Wrapper>
        <ContentCard
          item={makeContentItem()}
          selected={false}
          onSelectToggle={vi.fn()}
          onReview={vi.fn()}
          onQuickReject={vi.fn()}
        />
      </Wrapper>,
    );
    expect(screen.getByText("Daily Social Post")).toBeInTheDocument();
    expect(
      screen.getByText("This is the generated tweet content for testing purposes."),
    ).toBeInTheDocument();
  });

  it("renders Review and Reject buttons for pending_review status", () => {
    render(
      <Wrapper>
        <ContentCard
          item={makeContentItem()}
          selected={false}
          onSelectToggle={vi.fn()}
          onReview={vi.fn()}
          onQuickReject={vi.fn()}
        />
      </Wrapper>,
    );
    expect(screen.getByRole("button", { name: /review/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
  });

  it("does NOT render Reject or Approve buttons for published status", () => {
    render(
      <Wrapper>
        <ContentCard
          item={makeContentItem({ status: "published" })}
          selected={false}
          onSelectToggle={vi.fn()}
          onReview={vi.fn()}
          onQuickReject={vi.fn()}
        />
      </Wrapper>,
    );
    expect(screen.queryByRole("button", { name: /reject/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
  });

  it("calls onSelectToggle with item id when checkbox clicked", () => {
    const onSelectToggle = vi.fn();
    render(
      <Wrapper>
        <ContentCard
          item={makeContentItem()}
          selected={false}
          onSelectToggle={onSelectToggle}
          onReview={vi.fn()}
          onQuickReject={vi.fn()}
        />
      </Wrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: /select/i }));
    expect(onSelectToggle).toHaveBeenCalledWith("content-1");
  });
});

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/hooks/useIntegrations", () => {
  const mutateAsync = vi.fn().mockResolvedValue({});
  const reset = vi.fn();
  return {
    useConnectApiKey: () => ({
      mutateAsync,
      isPending: false,
      error: null,
      reset,
    }),
  };
});

import { APIKeyModal } from "@/components/integrations/APIKeyModal";

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("APIKeyModal", () => {
  it("does not render when provider is null", () => {
    const { container } = render(
      <APIKeyModal provider={null} onClose={vi.fn()} />,
      { wrapper: Wrapper },
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders subdomain extra field for zendesk provider", () => {
    render(<APIKeyModal provider="zendesk" onClose={vi.fn()} />, { wrapper: Wrapper });
    expect(screen.getByText("Zendesk Subdomain")).toBeInTheDocument();
  });

  it("shows validation error when api_key is too short on submit", async () => {
    render(<APIKeyModal provider="sendgrid" onClose={vi.fn()} />, { wrapper: Wrapper });
    fireEvent.submit(document.querySelector("form")!);
    await waitFor(() => {
      expect(
        screen.getByText(/at least 10 characters/i),
      ).toBeInTheDocument();
    });
  });

  it("closes on Escape key press", () => {
    const onClose = vi.fn();
    render(<APIKeyModal provider="sendgrid" onClose={onClose} />, { wrapper: Wrapper });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

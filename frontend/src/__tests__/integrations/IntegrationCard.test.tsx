import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";

vi.mock("@/hooks/useIntegrations", () => ({
  useInitiateOAuth: () => ({ mutate: vi.fn(), isPending: false }),
  useDisconnectIntegration: () => ({ mutate: vi.fn(), isPending: false }),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("IntegrationCard", () => {
  it("renders connect button when not connected (gmail)", () => {
    render(<IntegrationCard provider="gmail" onApiKeyConnect={vi.fn()} />, { wrapper: Wrapper });
    expect(screen.getByRole("button", { name: /connect/i })).toBeInTheDocument();
  });

  it("renders Connect for OAuth provider (gmail)", () => {
    render(<IntegrationCard provider="gmail" onApiKeyConnect={vi.fn()} />, { wrapper: Wrapper });
    expect(screen.getByText("Connect")).toBeInTheDocument();
  });

  it("renders Add API Key for api_key provider (sendgrid)", () => {
    render(<IntegrationCard provider="sendgrid" onApiKeyConnect={vi.fn()} />, { wrapper: Wrapper });
    expect(screen.getByText("Add API Key")).toBeInTheDocument();
  });

  it("renders Connect button for instagram (no longer Coming Soon)", () => {
    render(<IntegrationCard provider="instagram" onApiKeyConnect={vi.fn()} />, { wrapper: Wrapper });
    expect(screen.queryByText("Coming Soon")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connect/i })).not.toBeDisabled();
  });

  it("renders note text for instagram when not connected", () => {
    render(<IntegrationCard provider="instagram" onApiKeyConnect={vi.fn()} />, { wrapper: Wrapper });
    expect(screen.getByText(/Facebook Page/i)).toBeInTheDocument();
  });

  it("calls onApiKeyConnect with provider id when api_key button clicked", () => {
    const onApiKeyConnect = vi.fn();
    render(<IntegrationCard provider="sendgrid" onApiKeyConnect={onApiKeyConnect} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("Add API Key"));
    expect(onApiKeyConnect).toHaveBeenCalledWith("sendgrid");
  });
});

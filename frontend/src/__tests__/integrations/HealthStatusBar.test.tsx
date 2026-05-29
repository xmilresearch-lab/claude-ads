import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) =>
    <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/hooks/useIntegrations", () => ({
  useIntegrations: vi.fn(),
}));

import { useIntegrations } from "@/hooks/useIntegrations";
import { HealthStatusBar } from "@/components/integrations/HealthStatusBar";

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const mockIntegrations = {
  active:      { id: "1", provider: "gmail",     status: "active",       workspace_id: "w1", created_at: "", updated_at: "" },
  error:       { id: "2", provider: "twitter",   status: "error",        workspace_id: "w1", created_at: "", updated_at: "" },
  expiring:    { id: "3", provider: "linkedin",  status: "expiring",     workspace_id: "w1", created_at: "", updated_at: "" },
  disconnected:{ id: "4", provider: "sendgrid",  status: "disconnected", workspace_id: "w1", created_at: "", updated_at: "" },
}

describe("HealthStatusBar", () => {
  it("shows 'No integrations' when integration list is empty", () => {
    vi.mocked(useIntegrations).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useIntegrations>);
    render(<HealthStatusBar />, { wrapper: Wrapper });
    expect(screen.getByText("No integrations")).toBeInTheDocument();
  });

  it("shows error count when any integration has error status", () => {
    vi.mocked(useIntegrations).mockReturnValue({
      data: [mockIntegrations.error],
    } as unknown as ReturnType<typeof useIntegrations>);
    render(<HealthStatusBar />, { wrapper: Wrapper });
    expect(screen.getByText("1 error")).toBeInTheDocument();
  });

  it("shows plural errors for multiple errors", () => {
    vi.mocked(useIntegrations).mockReturnValue({
      data: [mockIntegrations.error, { ...mockIntegrations.error, id: "5", provider: "hubspot" }],
    } as unknown as ReturnType<typeof useIntegrations>);
    render(<HealthStatusBar />, { wrapper: Wrapper });
    expect(screen.getByText("2 errors")).toBeInTheDocument();
  });

  it("shows expiring count when integrations are expiring (no errors)", () => {
    vi.mocked(useIntegrations).mockReturnValue({
      data: [mockIntegrations.expiring],
    } as unknown as ReturnType<typeof useIntegrations>);
    render(<HealthStatusBar />, { wrapper: Wrapper });
    expect(screen.getByText("1 expiring")).toBeInTheDocument();
  });

  it("shows connected count when integrations are active", () => {
    vi.mocked(useIntegrations).mockReturnValue({
      data: [mockIntegrations.active],
    } as unknown as ReturnType<typeof useIntegrations>);
    render(<HealthStatusBar />, { wrapper: Wrapper });
    expect(screen.getByText("1 connected")).toBeInTheDocument();
  });

  it("opens popover when pill button is clicked", () => {
    vi.mocked(useIntegrations).mockReturnValue({
      data: [mockIntegrations.active],
    } as unknown as ReturnType<typeof useIntegrations>);
    render(<HealthStatusBar />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Integration Health")).toBeInTheDocument();
  });

  it("shows 'No integrations connected' in popover when all are disconnected", () => {
    vi.mocked(useIntegrations).mockReturnValue({
      data: [mockIntegrations.disconnected],
    } as unknown as ReturnType<typeof useIntegrations>);
    render(<HealthStatusBar />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("No integrations connected")).toBeInTheDocument();
  });

  it("shows integration name in popover for connected integrations", () => {
    vi.mocked(useIntegrations).mockReturnValue({
      data: [mockIntegrations.active],
    } as unknown as ReturnType<typeof useIntegrations>);
    render(<HealthStatusBar />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Gmail")).toBeInTheDocument();
  });

  it("shows 'Manage integrations' link in popover", () => {
    vi.mocked(useIntegrations).mockReturnValue({
      data: [mockIntegrations.active],
    } as unknown as ReturnType<typeof useIntegrations>);
    render(<HealthStatusBar />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/Manage integrations/)).toBeInTheDocument();
  });

  it("closes popover when pill is clicked again", () => {
    vi.mocked(useIntegrations).mockReturnValue({
      data: [mockIntegrations.active],
    } as unknown as ReturnType<typeof useIntegrations>);
    render(<HealthStatusBar />, { wrapper: Wrapper });
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(screen.getByText("Integration Health")).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByText("Integration Health")).not.toBeInTheDocument();
  });
})

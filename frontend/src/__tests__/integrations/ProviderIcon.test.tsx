import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProviderIcon } from "@/components/integrations/ProviderIcon";

describe("ProviderIcon", () => {
  it("renders the correct lettermark for a known provider", () => {
    render(<ProviderIcon provider="gmail" />);
    expect(screen.getByText("Gm")).toBeInTheDocument();
  });

  it("renders fallback ? for an unknown provider", () => {
    render(<ProviderIcon provider="unknown_provider_xyz" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("applies sm size classes", () => {
    const { container } = render(<ProviderIcon provider="gmail" size="sm" />);
    expect(container.firstChild).toHaveClass("w-6", "h-6");
  });
});

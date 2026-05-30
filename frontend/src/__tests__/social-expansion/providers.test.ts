import { describe, it, expect } from "vitest";
import {
  PROVIDER_CONFIGS,
  getProvidersByCategory,
} from "@/lib/integrations/providers";

describe("social provider expansion", () => {
  it("facebook provider exists with correct fields", () => {
    const fb = PROVIDER_CONFIGS.facebook;
    expect(fb).toBeDefined();
    expect(fb.id).toBe("facebook");
    expect(fb.category).toBe("social");
    expect(fb.authType).toBe("oauth");
    expect(fb.color).toBe("#1877F2");
    expect(fb.lettermark).toBe("Fb");
    expect(fb.note).toBeTruthy();
  });

  it("tiktok provider exists with correct fields", () => {
    const tk = PROVIDER_CONFIGS.tiktok;
    expect(tk).toBeDefined();
    expect(tk.id).toBe("tiktok");
    expect(tk.category).toBe("social");
    expect(tk.authType).toBe("oauth");
    expect(tk.color).toBe("#010101");
    expect(tk.lettermark).toBe("Tk");
    expect(tk.note).toBeTruthy();
  });

  it("threads provider exists with correct fields", () => {
    const th = PROVIDER_CONFIGS.threads;
    expect(th).toBeDefined();
    expect(th.id).toBe("threads");
    expect(th.category).toBe("social");
    expect(th.authType).toBe("oauth");
    expect(th.color).toBe("#101010");
    expect(th.lettermark).toBe("Th");
  });

  it("instagram no longer has comingSoon flag", () => {
    const ig = PROVIDER_CONFIGS.instagram;
    expect(ig).toBeDefined();
    expect(ig.comingSoon).toBeFalsy();
  });

  it("getProvidersByCategory('social') returns 6 providers", () => {
    const social = getProvidersByCategory("social");
    expect(social).toHaveLength(6);
    const ids = social.map((p) => p.id);
    expect(ids).toContain("twitter");
    expect(ids).toContain("linkedin");
    expect(ids).toContain("instagram");
    expect(ids).toContain("facebook");
    expect(ids).toContain("tiktok");
    expect(ids).toContain("threads");
  });

  it("ProviderConfig note field is optional string", () => {
    for (const config of Object.values(PROVIDER_CONFIGS)) {
      if (config.note !== undefined) {
        expect(typeof config.note).toBe("string");
        expect(config.note.length).toBeGreaterThan(0);
      }
    }
  });
});

import { describe, it, expect } from "vitest";
import { PLATFORM_CHAR_LIMITS, getCharCountState } from "@/lib/content/limits";

describe("new platform char limits", () => {
  it("facebook has limit of 63206", () => {
    expect(PLATFORM_CHAR_LIMITS.facebook).toBe(63206);
  });

  it("tiktok has limit of 2200", () => {
    expect(PLATFORM_CHAR_LIMITS.tiktok).toBe(2200);
  });

  it("threads has limit of 500", () => {
    expect(PLATFORM_CHAR_LIMITS.threads).toBe(500);
  });

  it("getCharCountState works for threads within limit", () => {
    const result = getCharCountState("Hello from Threads!", "threads");
    expect(result.limit).toBe(500);
    expect(result.isOverLimit).toBe(false);
    expect(result.severity).toBe("ok");
    expect(result.remaining).toBe(481);
  });

  it("getCharCountState detects threads over limit", () => {
    const longText = "a".repeat(510);
    const result = getCharCountState(longText, "threads");
    expect(result.isOverLimit).toBe(true);
    expect(result.severity).toBe("danger");
    expect(result.remaining).toBe(-10);
  });

  it("getCharCountState detects tiktok warning at 90%", () => {
    const text = "a".repeat(2000); // 2000/2200 = ~90.9%
    const result = getCharCountState(text, "tiktok");
    expect(result.severity).toBe("warning");
    expect(result.isOverLimit).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { getCharCountState } from "@/lib/content/limits";

describe("getCharCountState", () => {
  it("returns ok severity when under 90% of limit", () => {
    const result = getCharCountState("Hello world", "twitter");
    expect(result.severity).toBe("ok");
    expect(result.isOverLimit).toBe(false);
  });

  it("returns warning severity when over 90% of twitter limit", () => {
    const longText = "a".repeat(260); // 260/280 = 92.8%
    const result = getCharCountState(longText, "twitter");
    expect(result.severity).toBe("warning");
  });

  it("returns danger severity when over twitter limit", () => {
    const tooLong = "a".repeat(290);
    const result = getCharCountState(tooLong, "twitter");
    expect(result.severity).toBe("danger");
    expect(result.isOverLimit).toBe(true);
    expect(result.remaining).toBeLessThan(0);
  });

  it("returns null limit for gmail (no limit)", () => {
    const result = getCharCountState("Any length content", "gmail");
    expect(result.limit).toBeNull();
    expect(result.isOverLimit).toBe(false);
    expect(result.severity).toBe("ok");
  });

  it("calculates remaining correctly", () => {
    const text = "a".repeat(100);
    const result = getCharCountState(text, "twitter");
    expect(result.remaining).toBe(180); // 280 - 100
    expect(result.count).toBe(100);
  });
});

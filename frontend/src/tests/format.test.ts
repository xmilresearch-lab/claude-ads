import { describe, it, expect } from "vitest";
import { format } from "@/lib/utils/format";

describe("format.number", () => {
  it("formats integers with comma separators", () => {
    expect(format.number(1000)).toBe("1,000");
    expect(format.number(1_000_000)).toBe("1,000,000");
  });
  it("formats small numbers without separator", () => {
    expect(format.number(42)).toBe("42");
  });
});

describe("format.compact", () => {
  it("abbreviates thousands", () => {
    expect(format.compact(1500)).toMatch(/1\.?5K/i);
  });
  it("abbreviates millions", () => {
    expect(format.compact(2_000_000)).toMatch(/2M/i);
  });
});

describe("format.percent", () => {
  it("converts fraction to percentage string", () => {
    expect(format.percent(0.5)).toBe("50.0%");
    expect(format.percent(1)).toBe("100.0%");
    expect(format.percent(0)).toBe("0.0%");
  });
});

describe("format.usd", () => {
  it("formats as dollar with 4 decimal places", () => {
    expect(format.usd(1.5)).toBe("$1.5000");
    expect(format.usd(0)).toBe("$0.0000");
  });
});

describe("format.truncate", () => {
  it("returns string unchanged when under limit", () => {
    expect(format.truncate("hello", 10)).toBe("hello");
  });
  it("truncates at n chars and appends ellipsis", () => {
    const result = format.truncate("abcdefghij", 5);
    expect(result).toBe("abcde…");
  });
  it("uses default limit of 40", () => {
    const long = "a".repeat(41);
    expect(format.truncate(long)).toHaveLength(41); // 40 chars + ellipsis
  });
});

describe("format.initials", () => {
  it("returns uppercased first character of email", () => {
    expect(format.initials("alice@example.com")).toBe("A");
  });
  it("returns ? for empty string", () => {
    expect(format.initials("")).toBe("?");
  });
});

describe("format.planLabel", () => {
  it("maps known plans", () => {
    expect(format.planLabel("free")).toBe("Free");
    expect(format.planLabel("pro")).toBe("Pro");
    expect(format.planLabel("admin")).toBe("Admin");
  });
  it("returns raw value for unknown plan", () => {
    expect(format.planLabel("enterprise")).toBe("enterprise");
  });
});

import { describe, it, expect } from "vitest";
import { TIMEZONES, TIMEZONE_GROUPS } from "@/lib/utils/timezones";

// Timezones utility tests (co-located here to avoid extra test file)
describe("TIMEZONES", () => {
  it("contains at least 30 entries", () => {
    expect(TIMEZONES.length).toBeGreaterThanOrEqual(30);
  });

  it("every entry has value, label, and group", () => {
    for (const tz of TIMEZONES) {
      expect(tz.value).toBeTruthy();
      expect(tz.label).toBeTruthy();
      expect(TIMEZONE_GROUPS).toContain(tz.group);
    }
  });

  it("includes UTC", () => {
    const utc = TIMEZONES.find((t) => t.value === "UTC");
    expect(utc).toBeDefined();
    expect(utc?.group).toBe("UTC");
  });

  it("includes major US timezones", () => {
    const values = TIMEZONES.map((t) => t.value);
    expect(values).toContain("America/New_York");
    expect(values).toContain("America/Chicago");
    expect(values).toContain("America/Denver");
    expect(values).toContain("America/Los_Angeles");
  });

  it("includes major European timezones", () => {
    const values = TIMEZONES.map((t) => t.value);
    expect(values).toContain("Europe/London");
    expect(values).toContain("Europe/Paris");
    expect(values).toContain("Europe/Berlin");
  });

  it("includes major Asia/Pacific timezones", () => {
    const values = TIMEZONES.map((t) => t.value);
    expect(values).toContain("Asia/Tokyo");
    expect(values).toContain("Asia/Singapore");
    expect(values).toContain("Australia/Sydney");
  });

  it("has no duplicate values", () => {
    const values = TIMEZONES.map((t) => t.value);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

describe("TIMEZONE_GROUPS", () => {
  it("exports the four expected groups", () => {
    expect(TIMEZONE_GROUPS).toEqual(["UTC", "Americas", "Europe", "Asia/Pacific"]);
  });
});

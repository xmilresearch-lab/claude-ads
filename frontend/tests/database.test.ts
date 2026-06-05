import { vi, describe, it, expect, beforeAll } from "vitest";
import { z } from "zod";

// ── Mock @prisma/client BEFORE any import of lib/prisma ─────────────────────────

vi.mock("@prisma/client", () => {
  class PrismaClient {
    $connect = vi.fn();
    $disconnect = vi.fn();
    user = {};
    analysis = {};
    subscription = {};
    auditLog = {};
    team = {};
  }
  return { PrismaClient };
});

// Import AFTER mock registration (vitest hoists vi.mock above all imports)
const { prisma } = await import("@/lib/prisma");
const { PrismaClient } = await import("@prisma/client");

// ── Zod schema for Analysis.result ───────────────────────────────────────────────

const FrameworkSchema = z.object({
  name: z.string().min(1),
  focus: z.string().min(1),
  insight: z.string().min(1),
  improvements: z.array(z.string()).min(1),
  metric: z.string().min(1),
});

const AnalysisResultSchema = z.object({
  frameworks: z.array(FrameworkSchema).min(1).max(8),
  synthesis: z.object({
    overview: z.string().min(1),
    immediateActions: z.array(z.string()).min(1),
    executiveSummary: z.string().min(1),
  }),
});

type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

// ── Prisma singleton tests ────────────────────────────────────────────────────────

describe("Prisma singleton (lib/prisma.ts)", () => {
  it("exports a defined prisma value", () => {
    expect(prisma).toBeDefined();
  });

  it("constructs a PrismaClient instance", () => {
    expect(prisma).toBeInstanceOf(PrismaClient);
  });

  it("exports an object with the expected Prisma client shape", () => {
    expect(typeof (prisma as { $connect?: unknown }).$connect).toBe("function");
    expect(typeof (prisma as { $disconnect?: unknown }).$disconnect).toBe(
      "function"
    );
  });

  it("caches the instance in globalThis outside of production", () => {
    // NODE_ENV in vitest = 'test' — not 'production' — so the singleton
    // should be stored on globalThis for HMR de-duplication.
    const global = globalThis as Record<string, unknown>;
    expect(global["prisma"]).toBe(prisma);
  });
});

// ── Analysis result JSON schema tests ────────────────────────────────────────────

describe("Analysis result JSON schema", () => {
  const makeValidResult = (context = "SaaS"): AnalysisResult => ({
    frameworks: [
      {
        name: "AIDA",
        focus: "Attention → Interest → Desire → Action",
        insight: `Strong headline for ${context} but weak desire phase.`,
        improvements: [
          "Add social proof between Interest and Desire",
          "Replace generic CTA with outcome-oriented language",
        ],
        metric: "Click-through rate",
      },
      {
        name: "PAS",
        focus: "Problem → Agitate → Solution",
        insight: "Agitation is present but not personalised enough.",
        improvements: [
          "Use second-person language to personalise the pain",
          "Add cost-of-inaction statement",
        ],
        metric: "Time-on-page",
      },
      {
        name: "Value Stack",
        focus: "Perceived vs. actual value",
        insight: "No dollar anchoring present.",
        improvements: [
          "Stack bonuses with individual price tags",
          "Use strikethrough pricing to anchor the real price",
        ],
        metric: "Average order value",
      },
      {
        name: "FAB",
        focus: "Features → Advantages → Benefits",
        insight: "Copy stays at the Features layer.",
        improvements: ["Rewrite each feature as 'so you can…' benefit"],
        metric: "Conversion rate",
      },
      {
        name: "Before/After/Bridge",
        focus: "Transformation narrative",
        insight: "Bridge mechanism is vague.",
        improvements: ["Insert 3-step mechanism statement"],
        metric: "Lead quality score",
      },
      {
        name: "Social Proof Architecture",
        focus: "Trust signal placement",
        insight: "Social proof is generic and placed too late.",
        improvements: ["Move top testimonial above the fold"],
        metric: "Scroll depth",
      },
      {
        name: "Risk Reversal",
        focus: "Objection handling",
        insight: "Guarantee is buried in fine print.",
        improvements: ["Elevate guarantee to a prominent named section"],
        metric: "Cart abandonment rate",
      },
      {
        name: "Competitor Positioning",
        focus: "Differentiation",
        insight: "No comparison to obvious alternatives.",
        improvements: ["Add comparison table against top 2 alternatives"],
        metric: "Share of voice",
      },
    ],
    synthesis: {
      overview: `The ${context} offer has solid bones but under-communicates trust.`,
      immediateActions: [
        "Rewrite the headline to lead with the primary benefit",
        "Move the strongest testimonial above the fold",
        "Extend and elevate the guarantee section",
      ],
      executiveSummary: `Above-average positioning, below-average emotional resonance. Implementing the top actions should yield 15–30% conversion lift.`,
    },
  });

  it("validates a well-formed result with 8 frameworks", () => {
    const result = makeValidResult();
    const parsed = AnalysisResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it("rejects a result with no frameworks", () => {
    const bad = { ...makeValidResult(), frameworks: [] };
    const parsed = AnalysisResultSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });

  it("rejects a framework missing the metric field", () => {
    const result = makeValidResult();
    const firstFramework = result.frameworks[0];
    expect(firstFramework).toBeDefined();
    if (!firstFramework) return;

    const { metric: _removed, ...withoutMetric } = firstFramework;
    void _removed;

    const bad = {
      ...result,
      frameworks: [withoutMetric, ...result.frameworks.slice(1)],
    };
    const parsed = AnalysisResultSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });

  it("rejects a result with missing synthesis fields", () => {
    const result = makeValidResult();
    const bad = {
      ...result,
      synthesis: { overview: "ok" },
    };
    const parsed = AnalysisResultSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });

  it("rejects empty string values in required fields", () => {
    const result = makeValidResult();
    const firstFramework = result.frameworks[0];
    expect(firstFramework).toBeDefined();
    if (!firstFramework) return;

    const bad = {
      ...result,
      frameworks: [{ ...firstFramework, name: "" }, ...result.frameworks.slice(1)],
    };
    const parsed = AnalysisResultSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });

  it("seed result object has all 8 frameworks with required keys", () => {
    const result = makeValidResult("agency");
    expect(result.frameworks).toHaveLength(8);

    for (const framework of result.frameworks) {
      expect(framework).toHaveProperty("name");
      expect(framework).toHaveProperty("focus");
      expect(framework).toHaveProperty("insight");
      expect(framework).toHaveProperty("improvements");
      expect(framework).toHaveProperty("metric");
      expect(Array.isArray(framework.improvements)).toBe(true);
      expect(framework.improvements.length).toBeGreaterThan(0);
    }
  });

  it("synthesis has all required keys", () => {
    const { synthesis } = makeValidResult();
    expect(synthesis).toHaveProperty("overview");
    expect(synthesis).toHaveProperty("immediateActions");
    expect(synthesis).toHaveProperty("executiveSummary");
    expect(Array.isArray(synthesis.immediateActions)).toBe(true);
    expect(synthesis.immediateActions.length).toBeGreaterThan(0);
  });
});

// ── beforeAll guard ───────────────────────────────────────────────────────────────

beforeAll(() => {
  // Silence any unhandled console output from Prisma mock
});

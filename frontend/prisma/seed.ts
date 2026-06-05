import { PrismaClient, Tier, SubscriptionStatus, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// ── Types ────────────────────────────────────────────────────────────────────────

interface Framework {
  name: string;
  focus: string;
  insight: string;
  improvements: string[];
  metric: string;
}

interface AnalysisResult {
  frameworks: Framework[];
  synthesis: {
    overview: string;
    immediateActions: string[];
    executiveSummary: string;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────────

function makeResult(context: string): AnalysisResult {
  return {
    frameworks: [
      {
        name: "AIDA",
        focus: "Attention → Interest → Desire → Action",
        insight: `The attention hook in this ${context} offer is strong, but the transition to desire lacks emotional specificity.`,
        improvements: [
          "Add a visceral before/after image to the desire phase",
          "Replace generic CTA with outcome-oriented language",
          "Insert social proof between Interest and Desire",
        ],
        metric: "Click-through rate",
      },
      {
        name: "PAS",
        focus: "Problem → Agitate → Solution",
        insight: `The problem statement is accurate but the agitation phase for ${context} does not amplify urgency sufficiently.`,
        improvements: [
          "Use second-person language to personalise the pain",
          "Add a cost-of-inaction statement",
          "Tighten the solution reveal to one sentence",
        ],
        metric: "Time-on-page",
      },
      {
        name: "Value Stack",
        focus: "Perceived vs. actual value",
        insight: `The offer's perceived value for ${context} buyers is under-communicated — no dollar anchoring present.`,
        improvements: [
          "Stack at least three bonuses with individual price tags",
          "Use strikethrough pricing to anchor the real price",
          "Add a total value summary line before the CTA",
        ],
        metric: "Average order value",
      },
      {
        name: "FAB",
        focus: "Features → Advantages → Benefits",
        insight: `Most copy stays at the Features layer; advantages and benefits are implied but not explicit for ${context}.`,
        improvements: [
          "Rewrite each feature as 'so you can…' benefit statements",
          "Lead with the top benefit in the headline",
          "Remove feature-only bullet points with no advantage",
        ],
        metric: "Conversion rate",
      },
      {
        name: "Before/After/Bridge",
        focus: "Transformation narrative",
        insight: `The bridge (product mechanism) for ${context} is vague — readers cannot visualise the transformation path.`,
        improvements: [
          "Insert a clear mechanism statement ('how it works in 3 steps')",
          "Use contrasting imagery for before/after states",
          "Quantify the after state with real customer metrics",
        ],
        metric: "Lead quality score",
      },
      {
        name: "Social Proof Architecture",
        focus: "Trust signal placement and specificity",
        insight: `Social proof for ${context} is generic ('great product') and placed too late in the funnel.`,
        improvements: [
          "Move the strongest testimonial above the fold",
          "Add specificity: name, role, measurable result",
          "Include a recognisable logo bar for B2B credibility",
        ],
        metric: "Trust index (heatmap scroll depth)",
      },
      {
        name: "Risk Reversal",
        focus: "Objection handling and guarantee strength",
        insight: `The guarantee clause for ${context} is buried in fine print and lacks emotional commitment language.`,
        improvements: [
          "Elevate the guarantee to a prominent, named section",
          "Extend the guarantee period to industry-beating length",
          "Frame the guarantee as a promise, not a policy",
        ],
        metric: "Cart abandonment rate",
      },
      {
        name: "Competitor Positioning",
        focus: "Differentiation and moat clarity",
        insight: `The ${context} offer does not articulate why it beats the obvious alternatives; comparison is left to the reader.`,
        improvements: [
          "Add a comparison table against the top 2 alternatives",
          "Highlight the unique mechanism no competitor offers",
          "Use category creation language to reframe the conversation",
        ],
        metric: "Share of voice",
      },
    ],
    synthesis: {
      overview: `This ${context} offer demonstrates solid structural bones with a clear value proposition, but leaves significant conversion gains on the table through under-emphasised social proof and a weak risk reversal.`,
      immediateActions: [
        "Rewrite the headline to lead with the primary benefit, not the product name",
        "Move the strongest testimonial above the fold",
        "Extend and elevate the guarantee section",
        "Add dollar-anchored value stacking before the price reveal",
      ],
      executiveSummary: `The ${context} offer is above average in market positioning but below average in emotional resonance and trust architecture. Implementing the top four immediate actions should yield a 15–30% lift in conversion rate within 30 days.`,
    },
  };
}

function toJson(value: AnalysisResult): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

// ── Seed ─────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const seedEmails = ["free@test.com", "pro@test.com", "agency@test.com"];

  // Clean up existing seed records in dependency order
  await prisma.analysis.deleteMany({
    where: { user: { email: { in: seedEmails } } },
  });
  await prisma.subscription.deleteMany({
    where: { user: { email: { in: seedEmails } } },
  });
  await prisma.user.deleteMany({ where: { email: { in: seedEmails } } });

  // ── Users ────────────────────────────────────────────────────────────────────

  const freeUser = await prisma.user.create({
    data: {
      email: "free@test.com",
      name: "Free Test User",
      tier: Tier.FREE,
    },
  });

  const proUser = await prisma.user.create({
    data: {
      email: "pro@test.com",
      name: "Pro Test User",
      tier: Tier.PRO,
    },
  });

  const agencyUser = await prisma.user.create({
    data: {
      email: "agency@test.com",
      name: "Agency Test User",
      tier: Tier.AGENCY,
    },
  });

  console.log(`✓ Created 3 users (free, pro, agency)`);

  // ── Subscriptions ────────────────────────────────────────────────────────────

  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.subscription.create({
    data: {
      userId: proUser.id,
      stripeSubscriptionId: "sub_test_pro_monthly_001",
      stripePriceId: "price_pro_monthly_usd_4900",
      status: SubscriptionStatus.ACTIVE,
      tier: Tier.PRO,
      currentPeriodEnd: periodEnd,
    },
  });

  await prisma.subscription.create({
    data: {
      userId: agencyUser.id,
      stripeSubscriptionId: "sub_test_agency_monthly_001",
      stripePriceId: "price_agency_monthly_usd_19900",
      status: SubscriptionStatus.ACTIVE,
      tier: Tier.AGENCY,
      currentPeriodEnd: periodEnd,
    },
  });

  console.log(`✓ Created 2 subscriptions (pro, agency)`);

  // ── Analyses ─────────────────────────────────────────────────────────────────

  const analysisTypes = [
    "offer_analysis",
    "copy_audit",
    "headline_review",
    "funnel_analysis",
    "email_sequence",
  ] as const;

  const offerSamples: Record<string, string[]> = {
    [freeUser.id]: [
      "Lose 10 lbs in 30 days with our proven meal plan — zero hunger, zero gym.",
      "Finally fix your sleep: the 5-minute bedtime protocol that 12,000 people swear by.",
      "Learn Figma in a weekend. Our crash course gets you job-ready in 2 days.",
      "Double your freelance rate in 90 days or we'll refund every penny.",
      "The last budgeting spreadsheet you'll ever need — free download, no email required.",
    ],
    [proUser.id]: [
      "Close 3× more deals with our AI-powered sales script generator. Try 14 days free.",
      "Stop guessing at ad spend. Our attribution tool shows you exactly where revenue comes from.",
      "From 0 to 10k subscribers in 12 weeks: the newsletter growth OS used by 400+ creators.",
      "Automate your entire onboarding flow — set it up once, delight customers forever.",
      "Book 5 qualified demos a week with our LinkedIn outreach system. First 10 days free.",
    ],
    [agencyUser.id]: [
      "White-label our offer analysis platform for your agency — unlimited client accounts, your brand.",
      "Scale to 7 figures with our agency operations playbook: hiring, delivery, client retention.",
      "Enterprise CRO audit: we analyse your highest-traffic pages and deliver 90-day A/B roadmap.",
      "Manage 50+ client ad accounts from one dashboard — live P&L, anomaly alerts, auto-reports.",
      "The agency pitch deck that wins 6-figure retainers: 47-slide template, fully customisable.",
    ],
  };

  let analysisCount = 0;

  for (const user of [freeUser, proUser, agencyUser]) {
    const samples = offerSamples[user.id];
    if (!samples) continue;

    for (let i = 0; i < samples.length; i++) {
      const offerText = samples[i];
      const analysisType = analysisTypes[i % analysisTypes.length];
      if (offerText === undefined || analysisType === undefined) continue;

      await prisma.analysis.create({
        data: {
          userId: user.id,
          offerText,
          analysisType,
          result: toJson(makeResult(user.tier.toLowerCase())),
          shared: i === 0,
        },
      });
      analysisCount++;
    }
  }

  console.log(`✓ Created ${analysisCount} analyses (5 per user)`);
  console.log(`\nSeed complete: 3 users · 2 subscriptions · ${analysisCount} analyses`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

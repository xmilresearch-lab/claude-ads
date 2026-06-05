import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const sampleResult = {
  frameworks: [
    {
      name: 'Hormozi',
      focus: 'Value stacking and grand slam offer construction',
      insight: 'Your offer lacks clear value stacking. Consider adding bonuses and guarantees to increase the value-to-price ratio dramatically.',
      improvements: [
        'Add a 30-day money-back guarantee',
        'Stack 3 complementary bonuses worth 10x the price',
        'Reframe pricing against the dream outcome ROI',
      ],
      metric: 'Value-to-price ratio',
    },
    {
      name: 'GaryVee',
      focus: 'Attention arbitrage and platform-native content',
      insight: 'You are fishing in overfished waters. Find the platform where your audience lives but your competitors are absent.',
      improvements: [
        'Go all-in on one underpriced platform (TikTok or LinkedIn)',
        'Document the transformation, not the product',
        'Create 30 pieces of content per day from each client win',
      ],
      metric: 'Cost per engaged lead',
    },
    {
      name: 'Cardone',
      focus: '10X targets and pipeline volume',
      insight: 'Your goal is too small. If you miss a 10X target you still hit 3X. Multiply your pipeline by 10 to guarantee your base target.',
      improvements: [
        'Set a 10X revenue target and work backwards',
        'Call 100 prospects per day minimum',
        'Never go home without a follow-up scheduled',
      ],
      metric: 'Daily outbound volume',
    },
    {
      name: 'Belfort',
      focus: 'Straight Line Persuasion and tonality',
      insight: 'Your pitch lacks certainty on all three pillars: product, company, and you. Prospects buy certainty first, product second.',
      improvements: [
        'Script your first 4 seconds — tone creates belief',
        'Pre-handle the top 3 objections inside your pitch',
        'Use trial closes every 2-3 sentences',
      ],
      metric: 'Objection-to-close ratio',
    },
    {
      name: 'Kennedy',
      focus: 'Direct response copy and lead with transformation',
      insight: 'Every sentence in your copy must pass the "So what?" test. Lead with transformation, not features.',
      improvements: [
        'Rewrite your headline to lead with the dream outcome',
        'Remove every feature sentence and replace with a benefit',
        'Add urgency with a deadline that is real',
      ],
      metric: 'Email open and click-through rate',
    },
    {
      name: 'Brunson',
      focus: 'Hook/Story/Offer framework and funnel architecture',
      insight: 'Your funnel is leaking between hook and story. The offer is good but customers never reach it.',
      improvements: [
        'Create one irresistible hook tied to your dream customer avatar',
        'Build an Epiphany Bridge story connecting their pain to your solution',
        'Place your OTO immediately after signup, not later',
      ],
      metric: 'Funnel step conversion rate',
    },
    {
      name: 'Godin',
      focus: 'Permission marketing and minimum viable audience',
      insight: 'You are trying to sell to everyone. The smallest viable audience that you fully own is more valuable than mass attention you rent.',
      improvements: [
        'Define your 1,000 true fans and serve only them first',
        'Create something remarkable enough to be shared without asking',
        'Build an owned list before spending on ads',
      ],
      metric: 'Email list growth rate',
    },
    {
      name: 'Robbins',
      focus: 'RPM (Results/Purpose/Massive Action) and execution standards',
      insight: 'You have goals but not standards. Standards executed daily compound into the results goals only promise.',
      improvements: [
        'Define your non-negotiable daily actions and protect them',
        'Identify the one limiting belief blocking your breakthrough',
        'Set morning RPM in writing every day before 8am',
      ],
      metric: 'Daily non-negotiable completion rate',
    },
  ],
  synthesis: {
    overview: 'Your offer has strong potential but needs clearer value articulation, a tighter funnel, and consistent daily execution. The 8 frameworks converge on one insight: own your niche completely before expanding.',
    immediateActions: [
      'Add a risk-reversal guarantee this week',
      'Define your one platform and post daily for 90 days',
      'Set a 10X revenue target and write daily RPM',
    ],
    executiveSummary: 'Stack the value, own the niche, execute daily without exception.',
  },
}

async function main() {
  console.log('Seeding database...')

  const freeUser = await prisma.user.upsert({
    where: { email: 'free@test.com' },
    update: {},
    create: {
      email: 'free@test.com',
      name: 'Free Test User',
      tier: 'FREE',
    },
  })

  const proUser = await prisma.user.upsert({
    where: { email: 'pro@test.com' },
    update: {},
    create: {
      email: 'pro@test.com',
      name: 'Pro Test User',
      tier: 'PRO',
    },
  })

  const agencyUser = await prisma.user.upsert({
    where: { email: 'agency@test.com' },
    update: {},
    create: {
      email: 'agency@test.com',
      name: 'Agency Test User',
      tier: 'AGENCY',
    },
  })

  const offerTexts = [
    'I help e-commerce brands scale to $1M/month using our proven 3-step ad system with a 90-day money-back guarantee.',
    'We build custom SaaS products for service businesses in 60 days or you pay nothing. Average client ROI is 400%.',
    'Our sales coaching program takes B2B reps from $50K to $200K/year in 6 months through daily accountability and script mastery.',
  ]

  for (const user of [freeUser, proUser, agencyUser]) {
    for (let i = 0; i < 3; i++) {
      await prisma.analysis.create({
        data: {
          userId: user.id,
          offerText: offerTexts[i] ?? offerTexts[0] ?? 'Default offer text for testing purposes.',
          analysisType: 'offer',
          result: sampleResult,
        },
      })
    }
  }

  console.log('Seed complete.')
  console.log(`  Free user:   ${freeUser.email}`)
  console.log(`  Pro user:    ${proUser.email}`)
  console.log(`  Agency user: ${agencyUser.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

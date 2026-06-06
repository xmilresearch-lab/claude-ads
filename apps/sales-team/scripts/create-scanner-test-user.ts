/**
 * Creates a dedicated scanner test user and outputs its ID.
 * Run once: npx tsx scripts/create-scanner-test-user.ts
 * Store the resulting session token in TEST_SESSION_TOKEN for scanner use.
 *
 * This user is FREE tier — scanner never upgrades it, keeping costs minimal.
 * Rotate this token monthly after each Garak run.
 */
import { prisma } from '../lib/prisma'

async function main(): Promise<void> {
  const email = 'security-scanner@internal.test'

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: 'Security Scanner',
      tier: 'FREE',
    },
    update: {},
  })

  console.log('─'.repeat(50))
  console.log(`Scanner test user ready`)
  console.log(`  ID:    ${user.id}`)
  console.log(`  Email: ${email}`)
  console.log(`  Tier:  FREE (intentional — minimal API cost)`)
  console.log('─'.repeat(50))
  console.log('Next steps:')
  console.log('  1. Create a NextAuth session for this user in your DB.')
  console.log('  2. Copy the sessionToken value from the Session table.')
  console.log('  3. export TEST_SESSION_TOKEN=<that-token>')
  console.log('  4. npm run scan:live:localhost  (with dev server running)')
}

main()
  .catch((err: unknown) => {
    console.error('Failed to create scanner user:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

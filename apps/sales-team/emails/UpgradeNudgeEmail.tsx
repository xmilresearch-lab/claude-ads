import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface Props {
  name?: string
  analysisCount: number
  upgradeUrl: string
}

export default function UpgradeNudgeEmail({ name, analysisCount, upgradeUrl }: Props) {
  const remaining = Math.max(0, 3 - analysisCount)

  return (
    <Html>
      <Head />
      <Preview>
        {remaining > 0
          ? `You have ${remaining} free ${remaining === 1 ? 'analysis' : 'analyses'} left — here's what Pro unlocks`
          : "You've used all 3 free analyses — here's what you're missing"}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={label}>Day 5 — Your Account</Text>
          <Heading style={h1}>
            {remaining > 0
              ? `${remaining} free ${remaining === 1 ? 'analysis' : 'analyses'} left`
              : "Your free analyses are used up"}
          </Heading>

          <Text style={text}>Hey{name ? ` ${name}` : ''},</Text>

          <Text style={text}>
            {remaining > 0
              ? `You've run ${analysisCount} ${analysisCount === 1 ? 'analysis' : 'analyses'} so far. Here's what Solo unlocks when you're ready to go deeper:`
              : "You've hit the free limit. Here's everything waiting for you on Solo:"}
          </Text>

          <Section style={featureList}>
            <Text style={feature}>✓ <strong>50 analyses/day</strong> — never hit a wall mid-project</Text>
            <Text style={feature}>✓ <strong>Full history</strong> — compare strategies over time</Text>
            <Text style={feature}>✓ <strong>AI coaching assistant</strong> — ask follow-up questions on any analysis</Text>
            <Text style={feature}>✓ <strong>Shareable analysis cards</strong> — OG image + public link for each strategy</Text>
            <Text style={feature}>✓ <strong>PDF export</strong> — download strategy docs for client presentations</Text>
          </Section>

          <Text style={price}>
            Solo Plan — <strong>$49/month</strong>. Cancel anytime.
          </Text>

          <Button style={button} href={upgradeUrl}>
            Unlock Unlimited Strategies →
          </Button>

          <Text style={text}>
            If you&apos;re running any kind of business or sales operation, you&apos;ll use this
            more than any other tool you&apos;re paying for. That&apos;s not a promise — it&apos;s
            just what happens when 8 frameworks analyze your exact situation simultaneously.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>$100M AI Sales Team · Unsubscribe</Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#030712', fontFamily: 'system-ui, -apple-system, sans-serif' }
const container = { margin: '0 auto', padding: '40px 24px', maxWidth: '560px' }
const label = { color: '#2563eb', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '8px' }
const h1 = { color: '#f1f5f9', fontSize: '24px', fontWeight: '700', marginBottom: '24px' }
const text = { color: '#94a3b8', fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }
const featureList = { background: '#0f172a', borderRadius: '8px', padding: '20px 24px', marginBottom: '20px' }
const feature = { color: '#e2e8f0', fontSize: '15px', lineHeight: '1.6', marginBottom: '10px' }
const price = { color: '#60a5fa', fontSize: '18px', marginBottom: '20px', textAlign: 'center' as const }
const button = {
  backgroundColor: '#2563eb', borderRadius: '8px', color: '#fff',
  fontSize: '16px', fontWeight: '600', textDecoration: 'none',
  textAlign: 'center' as const, display: 'block', padding: '14px 24px', marginBottom: '24px',
}
const hr = { borderColor: '#1e293b', margin: '24px 0' }
const footer = { color: '#475569', fontSize: '13px' }
